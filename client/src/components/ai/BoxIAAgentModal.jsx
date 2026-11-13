import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X, Send, FileText, CheckCircle,
  Search, Loader2, Copy, Trash2, Check, MessageSquare, FolderOpen,
  Sparkles, Bot
} from 'lucide-react';
import boxIaIcon from '../../assets/box-ia-icon.png';
import {
  askBoxIA,
  getBoxIAUsage,
  readNimboxFileForAI,
  isSupportedBoxIADocument
} from '../../services/boxIAService.js';

/**
 * Renderizador limpio y profesional para las respuestas en párrafos de Box IA (sin asteriscos *)
 */
const FormattedAiMessage = ({ text }) => {
  if (!text) return null;
  const cleanText = text
    .replace(/\[Pág\.\s*\d+\]\s*/gi, '')
    .replace(/\*+/g, '')
    .replace(/`+/g, '');
  const lines = cleanText.split('\n');

  const renderStructuredLine = (lineStr) => {
    const trimmed = lineStr.trim();
    if (trimmed.startsWith('• ')) {
      const content = trimmed.slice(2).trim();
      const colonIdx = content.indexOf(':');
      if (colonIdx > 0 && colonIdx < 50) {
        const label = content.slice(0, colonIdx).trim();
        const rest = content.slice(colonIdx + 1).trim();
        return (
          <span>
            <strong style={{ color: 'var(--primary)', fontWeight: 700 }}>• {label}:</strong> {rest}
          </span>
        );
      }
      return (
        <span>
          <strong style={{ color: 'var(--primary)', fontWeight: 700 }}>•</strong> {content}
        </span>
      );
    }
    return trimmed;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', lineHeight: 1.68 }}>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        if (trimmed === '---') {
          return <hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '6px 0' }} />;
        }
        if (/^#{1,4}\s+/.test(trimmed)) {
          const headingText = trimmed.replace(/^#{1,4}\s+/, '');
          return (
            <div key={i} style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--text-main)', marginTop: '4px' }}>
              {headingText}
            </div>
          );
        }
        return (
          <p key={i} style={{ margin: 0, wordBreak: 'break-word', textAlign: 'left' }}>
            {renderStructuredLine(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

const INITIAL_WELCOME_MESSAGE = {
  role: 'assistant',
  content:
    '¡Hola! Soy Box IA, tu asistente inteligente de documentos en Nimbox Cloud.\n\n' +
    '• Paso 1: Selecciona uno o varios documentos de tu nube (PDF, Word, Excel, TXT, CSV o código).\n' +
    '• Paso 2: Elige una acción rápida o escribe tu pregunta para recibir una respuesta concreta y bien estructurada.'
};

export const BoxIAAgentModal = ({ isOpen, onClose, files = [], initialSelectedFile = null, onNotification }) => {
  const [selectedIds, setSelectedIds] = useState([]);
  const [fileSearch, setFileSearch] = useState('');
  const [loadedStats, setLoadedStats] = useState({});
  const [messages, setMessages] = useState([INITIAL_WELCOME_MESSAGE]);
  const [question, setQuestion] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [copiedMsgIdx, setCopiedMsgIdx] = useState(null);
  const [logoError, setLogoError] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  const [mobileTab, setMobileTab] = useState('chat'); // 'chat' | 'docs'
  // Límite diario de preguntas según el plan: { used, limit } o null mientras carga
  const [usage, setUsage] = useState(null);
  const remaining = usage ? Math.max(0, usage.limit - usage.used) : null;
  const limitReached = usage !== null && remaining === 0;

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    getBoxIAUsage().then((u) => { if (!cancelled) setUsage(u); });
    return () => { cancelled = true; };
  }, [isOpen]);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filtrar exclusivamente documentos analizables (PDF, Word, Excel, TXT, CSV, código) excluyendo multimedia
  const documentFiles = useMemo(
    () => files.filter((f) => isSupportedBoxIADocument(f)),
    [files]
  );

  // Reiniciar siempre la conversación cuando se abre o se cierra el agente Box IA
  useEffect(() => {
    setMessages([INITIAL_WELCOME_MESSAGE]);
    setQuestion('');
    setIsThinking(false);
    setCopiedMsgIdx(null);
    setMobileTab('chat');

    if (!isOpen) return;

    if (initialSelectedFile?.id && isSupportedBoxIADocument(initialSelectedFile)) {
      setSelectedIds([initialSelectedFile.id]);
    } else if (documentFiles.length > 0) {
      setSelectedIds((prev) => {
        const validPrev = prev.filter((id) => documentFiles.some((df) => df.id === id));
        return validPrev.length > 0 ? validPrev : [documentFiles[0].id];
      });
    } else {
      setSelectedIds([]);
    }
  }, [isOpen, initialSelectedFile, documentFiles]);

  const handleCloseModal = () => {
    setMessages([INITIAL_WELCOME_MESSAGE]);
    setQuestion('');
    setIsThinking(false);
    setCopiedMsgIdx(null);
    setMobileTab('chat');
    onClose && onClose();
  };

  // Leer en segundo plano los archivos seleccionados para mostrar su conteo de páginas/palabras al instante
  useEffect(() => {
    if (!isOpen || selectedIds.length === 0) return;

    selectedIds.forEach(async (id) => {
      const targetFile = documentFiles.find((f) => f.id === id);
      if (!targetFile || loadedStats[id]?.loaded || loadedStats[id]?.loading) return;

      setLoadedStats((prev) => ({ ...prev, [id]: { loading: true } }));
      try {
        const parsed = await readNimboxFileForAI(targetFile);
        setLoadedStats((prev) => ({
          ...prev,
          [id]: {
            loading: false,
            loaded: true,
            wordCount: parsed.wordCount,
            lineCount: parsed.lineCount,
            pageCount: parsed.pageCount || 0,
            sourceKind: parsed.sourceKind
          }
        }));
      } catch (err) {
        setLoadedStats((prev) => ({
          ...prev,
          [id]: { loading: false, loaded: false, error: err.message }
        }));
      }
    });
  }, [isOpen, selectedIds, documentFiles]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const selectedFiles = useMemo(
    () => documentFiles.filter((f) => selectedIds.includes(f.id)),
    [documentFiles, selectedIds]
  );

  const filteredFiles = useMemo(() => {
    const q = fileSearch.trim().toLowerCase();
    if (!q) return documentFiles;
    return documentFiles.filter((f) => f.name.toLowerCase().includes(q) || (f.ext || '').toLowerCase().includes(q));
  }, [documentFiles, fileSearch]);

  if (!isOpen) return null;

  const toggleFileSelection = (fileId) => {
    setSelectedIds((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  };

  const handleSendQuestion = async (customPrompt = null) => {
    const textToSend = (customPrompt !== null ? customPrompt : question).trim();
    if (!textToSend || isThinking) return;

    if (limitReached) {
      onNotification && onNotification(
        usage.limit === 0
          ? 'Box IA está disponible con un plan activo.'
          : `Llegaste al límite de ${usage.limit} preguntas diarias de tu plan. Vuelve mañana o mejora tu plan.`,
        'error'
      );
      return;
    }

    if (selectedFiles.length === 0) {
      if (isMobile) setMobileTab('docs');
      onNotification && onNotification('Selecciona al menos un documento para analizarlo con Box IA.', 'error');
      return;
    }

    if (customPrompt === null) {
      setQuestion('');
    }
    if (isMobile && mobileTab !== 'chat') {
      setMobileTab('chat');
    }

    const updatedHistory = [...messages, { role: 'user', content: textToSend }];
    setMessages(updatedHistory);
    setIsThinking(true);

    try {
      const result = await askBoxIA({
        question: textToSend,
        selectedFiles,
        conversationHistory: updatedHistory
      });

      if (result.usage) setUsage(result.usage);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result.answer,
          docsUsed: selectedFiles.map((f) => f.name)
        }
      ]);
    } catch (err) {
      if (err.usage) setUsage(err.usage);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ No se pudo procesar la consulta: ${err.message}`
        }
      ]);
    } finally {
      setIsThinking(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  };

  const handleCopyMessage = async (text, idx) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsgIdx(idx);
      setTimeout(() => setCopiedMsgIdx(null), 1800);
    } catch {}
  };

  const quickPrompts = [
    { label: '📄 Resumir documento', prompt: 'Haz un resumen ejecutivo claro y bien estructurado de este documento.' },
    { label: '🔑 Extraer puntos clave', prompt: 'Extrae los puntos clave y las ideas principales más importantes del documento.' },
    { label: '💰 Fechas, montos y datos', prompt: '¿Qué fechas, montos, cifras, autores o datos específicos menciona el documento?' },
    { label: '❓ ¿De qué trata?', prompt: '¿De qué trata este documento, cuál es su objetivo y qué temas abarca?' }
  ];

  const showDocsPanel = !isMobile || mobileTab === 'docs';
  const showChatPanel = !isMobile || mobileTab === 'chat';

  return (
    <div
      onClick={handleCloseModal}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : '1rem'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: isMobile ? '100%' : '1060px',
          height: isMobile ? '100dvh' : 'min(86vh, 760px)',
          maxHeight: isMobile ? '100dvh' : '92vh',
          background: 'var(--bg-card)',
          borderRadius: isMobile ? 0 : 'var(--radius-xl)',
          border: isMobile ? 'none' : '1px solid var(--border-color)',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* TOP HEADER */}
        <div
          style={{
            padding: isMobile ? '10px 14px' : '14px 20px',
            background: 'linear-gradient(135deg, #312e81 0%, #4f46e5 60%, #7c3aed 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexShrink: 0
          }}
        >
          {/* Lado izquierdo: Logo + Título */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '12px', minWidth: 0 }}>
            <div
              style={{
                width: isMobile ? '38px' : '44px',
                height: isMobile ? '38px' : '44px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px',
                flexShrink: 0,
                overflow: 'hidden'
              }}
            >
              {!logoError ? (
                <img
                  src={boxIaIcon}
                  alt="Box IA Logo"
                  onError={() => setLogoError(true)}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                />
              ) : (
                <Bot size={22} color="#4f46e5" />
              )}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: isMobile ? '1.05rem' : '1.18rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
                  Box IA
                </h2>
                <span
                  style={{
                    fontSize: isMobile ? '0.65rem' : '0.68rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '999px',
                    background: 'rgba(255, 255, 255, 0.22)',
                    color: '#fff',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isMobile ? 'by Nimbox' : 'by Nimbox · Agente de Documentos'}
                </span>
              </div>
              {!isMobile && (
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', opacity: 0.88 }}>
                  Selecciona documentos de tu nube Nimbox y haz preguntas sobre su contenido al instante.
                </p>
              )}
            </div>
          </div>

          {/* Lado derecho superior: Botones Limpiar y Cerrar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: 'auto' }}>
            <button
              type="button"
              onClick={() => setMessages([INITIAL_WELCOME_MESSAGE])}
              style={{
                height: '36px',
                padding: isMobile ? '0 10px' : '0 12px',
                borderRadius: '9px',
                border: '1px solid rgba(255, 255, 255, 0.28)',
                background: 'rgba(255, 255, 255, 0.16)',
                color: '#fff',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                transition: 'background 0.15s ease'
              }}
              title="Limpiar conversación del chat"
              aria-label="Limpiar chat"
            >
              <Trash2 size={15} />
              {!isMobile && <span>Limpiar chat</span>}
            </button>

            <button
              type="button"
              onClick={handleCloseModal}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '9px',
                border: '1px solid rgba(255, 255, 255, 0.28)',
                background: 'rgba(255, 255, 255, 0.16)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s ease'
              }}
              title="Cerrar Box IA"
              aria-label="Cerrar"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        {/* BARRA DE PESTAÑAS MÓVIL (SOLO EN TELÉFONOS) */}
        {isMobile && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
              padding: '8px 12px',
              background: 'var(--bg-subtle)',
              borderBottom: '1px solid var(--border-color)',
              flexShrink: 0
            }}
          >
            <button
              type="button"
              onClick={() => setMobileTab('chat')}
              style={{
                padding: '8px 10px',
                borderRadius: '9px',
                border: mobileTab === 'chat' ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                background: mobileTab === 'chat' ? 'var(--primary-light)' : 'var(--bg-card)',
                color: mobileTab === 'chat' ? 'var(--primary)' : 'var(--text-muted)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <MessageSquare size={14} />
              <span>Chat con Box IA</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileTab('docs')}
              style={{
                padding: '8px 10px',
                borderRadius: '9px',
                border: mobileTab === 'docs' ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                background: mobileTab === 'docs' ? 'var(--primary-light)' : 'var(--bg-card)',
                color: mobileTab === 'docs' ? 'var(--primary)' : 'var(--text-muted)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <FolderOpen size={14} />
              <span>Documentos ({selectedFiles.length}/{documentFiles.length})</span>
            </button>
          </div>
        )}

        {/* MAIN BODY: DESKTOP 2-COL GRID / MOBILE FULL-WIDTH TAB */}
        <div
          style={{
            flex: 1,
            display: isMobile ? 'flex' : 'grid',
            flexDirection: isMobile ? 'column' : undefined,
            gridTemplateColumns: isMobile ? undefined : 'minmax(260px, 320px) 1fr',
            minHeight: 0,
            overflow: 'hidden'
          }}
        >
          {/* PANEL DE SELECCIÓN DE DOCUMENTOS */}
          {showDocsPanel && (
            <div
              style={{
                flex: isMobile ? 1 : undefined,
                borderRight: isMobile ? 'none' : '1px solid var(--border-color)',
                background: 'var(--bg-subtle)',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0
              }}
            >
              <div style={{ padding: '12px 14px 10px 14px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                    Documentos en tu Nube ({documentFiles.length})
                  </span>
                  {selectedIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedIds([])}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      Deseleccionar ({selectedIds.length})
                    </button>
                  )}
                </div>

                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={fileSearch}
                    onChange={(e) => setFileSearch(e.target.value)}
                    placeholder="Filtrar tus documentos..."
                    style={{
                      width: '100%',
                      padding: '8px 10px 8px 30px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)',
                      fontSize: '0.84rem',
                      color: 'var(--text-main)',
                      outline: 'none'
                    }}
                  />
                  <Search size={14} color="var(--text-light)" style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              {/* FILE LIST */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredFiles.length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {documentFiles.length === 0
                      ? 'Aún no tienes documentos (PDF, Word, Excel, TXT) subidos a Nimbox Cloud para analizar con Box IA.'
                      : 'Ningún documento coincide con tu búsqueda.'}
                  </div>
                ) : (
                  filteredFiles.map((file) => {
                    const isSelected = selectedIds.includes(file.id);
                    const stat = loadedStats[file.id];
                    const ext = (file.ext || '').toUpperCase() || 'DOC';

                    return (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => toggleFileSelection(file.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          padding: '11px 12px',
                          borderRadius: '11px',
                          border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                          background: isSelected ? 'var(--primary-light)' : 'var(--bg-card)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          width: '100%'
                        }}
                      >
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '6px',
                            border: isSelected ? 'none' : '1.5px solid var(--border-hover)',
                            background: isSelected ? 'var(--primary)' : 'var(--bg-subtle)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '2px'
                          }}
                        >
                          {isSelected && <Check size={13} />}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '0.86rem',
                              fontWeight: 700,
                              color: 'var(--text-main)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            title={file.name}
                          >
                            {file.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontSize: '0.66rem',
                                fontWeight: 800,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: 'var(--bg-subtle)',
                                color: 'var(--primary)',
                                border: '1px solid var(--border-color)'
                              }}
                            >
                              {ext}
                            </span>
                            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{file.size}</span>
                          </div>

                          {isSelected && stat && (
                            <div style={{ marginTop: '6px', fontSize: '0.73rem', fontWeight: 600 }}>
                              {stat.loading ? (
                                <span style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Extrayendo texto...
                                </span>
                              ) : stat.error ? (
                                <span style={{ color: 'var(--danger)' }}>⚠️ {stat.error}</span>
                              ) : stat.loaded ? (
                                <span style={{ color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <CheckCircle size={11} />
                                  {stat.wordCount > 0
                                    ? `Leído (${stat.pageCount ? `${stat.pageCount} pág · ` : ''}${stat.wordCount.toLocaleString()} palabras)`
                                    : 'Archivo listo'}
                                </span>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {isMobile && (
                <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                  <button
                    type="button"
                    onClick={() => setMobileTab('chat')}
                    className="btn-primary"
                    style={{
                      width: '100%',
                      padding: '11px 16px',
                      borderRadius: '10px',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <MessageSquare size={16} />
                    <span>Ir al Chat ({selectedFiles.length} seleccionado{selectedFiles.length === 1 ? '' : 's'})</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PANEL DE CHAT CON BOX IA */}
          {showChatPanel && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--bg-card)' }}>
              {/* SELECTED FILES BAR & QUICK CHIPS */}
              <div
                style={{
                  padding: isMobile ? '9px 12px' : '12px 16px',
                  borderBottom: '1px solid var(--border-color)',
                  background: 'var(--bg-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: isMobile ? '7px' : '8px',
                  flexShrink: 0
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      overflowX: 'auto',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      minWidth: 0,
                      paddingBottom: '2px'
                    }}
                  >
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 }}>
                      Analizando:
                    </span>
                    {selectedFiles.length === 0 ? (
                      <span style={{ fontSize: '0.76rem', color: 'var(--danger)', fontWeight: 600 }}>
                        Ningún documento seleccionado
                      </span>
                    ) : (
                      selectedFiles.map((f) => (
                        <span
                          key={f.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 9px',
                            borderRadius: '999px',
                            background: 'var(--primary-light)',
                            color: 'var(--primary)',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            maxWidth: isMobile ? '210px' : '280px'
                          }}
                        >
                          <FileText size={12} style={{ flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleFileSelection(f.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--primary)',
                              cursor: 'pointer',
                              padding: 0,
                              display: 'flex',
                              flexShrink: 0
                            }}
                            title="Quitar de la selección"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {isMobile && (
                    <button
                      type="button"
                      onClick={() => setMobileTab('docs')}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--primary)',
                        borderRadius: '999px',
                        padding: '3px 9px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      Cambiar
                    </button>
                  )}
                </div>

                {/* QUICK ACTION BUTTONS (Horizontal swipeable strip on mobile) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexWrap: isMobile ? 'nowrap' : 'wrap',
                    overflowX: isMobile ? 'auto' : 'visible',
                    paddingBottom: isMobile ? '2px' : 0,
                    WebkitOverflowScrolling: 'touch'
                  }}
                >
                  {quickPrompts.map((qp) => (
                    <button
                      key={qp.label}
                      type="button"
                      disabled={isThinking || selectedFiles.length === 0}
                      onClick={() => handleSendQuestion(qp.prompt)}
                      style={{
                        padding: isMobile ? '5px 10px' : '5px 10px',
                        borderRadius: '999px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        cursor: isThinking || selectedFiles.length === 0 ? 'not-allowed' : 'pointer',
                        opacity: isThinking || selectedFiles.length === 0 ? 0.55 : 1,
                        transition: 'all 0.15s'
                      }}
                    >
                      {qp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* CHAT MESSAGES */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: isMobile ? '12px 12px' : '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                {messages.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isUser ? 'flex-end' : 'flex-start'
                      }}
                    >
                      {!isUser && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                          <img
                            src={boxIaIcon}
                            alt="Box IA"
                            style={{ width: '22px', height: '22px', objectFit: 'contain' }}
                          />
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--primary)' }}>
                            Box IA
                          </span>
                        </div>
                      )}
                      <div
                        style={{
                          maxWidth: isMobile ? '96%' : '88%',
                          padding: isMobile ? '11px 13px' : '12px 15px',
                          borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                          background: isUser ? 'var(--primary)' : 'var(--bg-subtle)',
                          color: isUser ? '#fff' : 'var(--text-main)',
                          border: isUser ? 'none' : '1px solid var(--border-color)',
                          fontSize: isMobile ? '0.86rem' : '0.88rem',
                          boxShadow: 'var(--shadow-xs)'
                        }}
                      >
                        {isUser ? (
                          <div style={{ wordBreak: 'break-word', fontWeight: 500 }}>{msg.content}</div>
                        ) : (
                          <>
                            <FormattedAiMessage text={msg.content} />
                            {idx > 0 && (
                              <div
                                style={{
                                  marginTop: '10px',
                                  paddingTop: '8px',
                                  borderTop: '1px solid var(--border-color)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  flexWrap: 'wrap',
                                  gap: '8px',
                                  fontSize: '0.72rem',
                                  color: 'var(--text-muted)'
                                }}
                              >
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? '170px' : '320px' }}>
                                  {msg.docsUsed?.length
                                    ? `Fuente: ${msg.docsUsed.join(', ')}`
                                    : 'Box IA · Nimbox Cloud'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyMessage(msg.content, idx)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--primary)',
                                    fontWeight: 700,
                                    fontSize: '0.72rem',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <Copy size={12} />
                                  {copiedMsgIdx === idx ? '¡Copiado!' : 'Copiar respuesta'}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isThinking && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Box IA está leyendo y analizando el documento...</span>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Aviso de privacidad: el texto de los documentos sale a un servicio externo */}
              <p
                style={{
                  margin: 0,
                  padding: isMobile ? '6px 12px' : '6px 16px',
                  borderTop: '1px solid var(--border-color)',
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-muted)',
                  fontSize: '0.72rem',
                  lineHeight: 1.4,
                  flexShrink: 0
                }}
              >
                {usage && (
                  <strong style={{ color: limitReached ? 'var(--danger)' : 'var(--primary)', fontWeight: 700 }}>
                    {usage.limit === 0
                      ? 'Box IA está disponible con un plan activo. '
                      : limitReached
                        ? `Llegaste al límite de ${usage.limit} preguntas de hoy. `
                        : `Te quedan ${remaining} de ${usage.limit} preguntas hoy. `}
                  </strong>
                )}
                Box IA envía el texto de los documentos seleccionados a un servicio de IA externo (DeepSeek) para responder. Evita usarlo con información confidencial.
              </p>

              {/* INPUT FORM */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendQuestion();
                }}
                style={{
                  padding: isMobile ? '10px 12px' : '12px 16px',
                  borderTop: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexShrink: 0
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={isThinking}
                  placeholder={
                    selectedFiles.length > 0
                      ? isMobile
                        ? 'Escribe tu pregunta sobre el documento...'
                        : `Pregunta lo que quieras sobre ${selectedFiles.length === 1 ? `"${selectedFiles[0].name}"` : `los ${selectedFiles.length} documentos seleccionados`}...`
                      : 'Selecciona primero un documento...'
                  }
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: isMobile ? '10px 12px' : '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-body)',
                    color: 'var(--text-main)',
                    fontSize: isMobile ? '0.86rem' : '0.88rem',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={!question.trim() || isThinking || selectedFiles.length === 0 || limitReached}
                  className="btn-primary"
                  style={{
                    padding: isMobile ? '10px 14px' : '10px 18px',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexShrink: 0,
                    cursor: !question.trim() || isThinking || selectedFiles.length === 0 || limitReached ? 'not-allowed' : 'pointer',
                    opacity: !question.trim() || isThinking || selectedFiles.length === 0 || limitReached ? 0.6 : 1
                  }}
                >
                  <Send size={15} />
                  {!isMobile && <span>Preguntar</span>}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BoxIAAgentModal;
