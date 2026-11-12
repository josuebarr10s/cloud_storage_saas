import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles, X, Send, FileText, CheckCircle,
  Search, Loader2, Copy, Trash2, Check
} from 'lucide-react';
import {
  askBoxIA,
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
    // Si es un punto estructurado tipo "• Administrador: Encargado de..." resaltar el nombre con tipografía limpia
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', lineHeight: 1.7 }}>
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
    '• Paso 1: Selecciona uno o varios archivos de tu nube en el panel izquierdo (PDF, Word, Excel, TXT, CSV o código).\n' +
    '• Paso 2: Elige un botón rápido o escribe cualquier pregunta sobre el documento para recibir una respuesta concreta y bien estructurada.'
};

export const BoxIAAgentModal = ({ isOpen, onClose, files = [], initialSelectedFile = null, onNotification }) => {
  const [selectedIds, setSelectedIds] = useState([]);
  const [fileSearch, setFileSearch] = useState('');
  const [loadedStats, setLoadedStats] = useState({}); // { [fileId]: { loading, wordCount, pageCount, lineCount, error } }
  const [messages, setMessages] = useState([INITIAL_WELCOME_MESSAGE]);
  const [question, setQuestion] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [copiedMsgIdx, setCopiedMsgIdx] = useState(null);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Filtrar exclusivamente documentos analizables (PDF, Word, Excel, TXT, CSV, código) excluyendo multimedia (fotos, videos, audios)
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

    if (selectedFiles.length === 0) {
      onNotification && onNotification('Selecciona al menos un archivo en la columna izquierda para analizarlo.', 'error');
      return;
    }

    if (customPrompt === null) {
      setQuestion('');
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

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result.answer,
          docsUsed: selectedFiles.map((f) => f.name)
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **No se pudo procesar la consulta:** ${err.message}`
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
        padding: '1rem'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '1060px',
          height: 'min(86vh, 760px)',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* TOP HEADER */}
        <div
          style={{
            padding: '14px 20px',
            background: 'linear-gradient(135deg, #312e81 0%, #4f46e5 60%, #7c3aed 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.94)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3px',
                flexShrink: 0
              }}
            >
              <img
                src="/box-ia-icon.png"
                alt="Box IA Logo"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
                  Box IA
                </h2>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: '#fff'
                  }}
                >
                  by Nimbox · Agente de Documentos
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', opacity: 0.88 }}>
                Selecciona documentos de tu nube Nimbox y haz preguntas sobre su contenido al instante.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setMessages([INITIAL_WELCOME_MESSAGE])}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#fff',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title="Limpiar chat"
            >
              <Trash2 size={14} />
              <span>Limpiar chat</span>
            </button>

            <button
              type="button"
              onClick={handleCloseModal}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Cerrar Box IA"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* MAIN BODY: LEFT FILE SELECTOR + RIGHT CHAT */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'minmax(260px, 320px) 1fr',
            minHeight: 0,
            overflow: 'hidden'
          }}
          className="nb-boxia-grid"
        >
          {/* LEFT PANEL: FILE PICKER */}
          <div
            style={{
              borderRight: '1px solid var(--border-color)',
              background: 'var(--bg-subtle)',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0
            }}
          >
            <div style={{ padding: '14px 14px 10px 14px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
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
                    padding: '7px 10px 7px 30px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    fontSize: '0.82rem',
                    color: 'var(--text-main)',
                    outline: 'none'
                  }}
                />
                <Search size={14} color="var(--text-light)" style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            {/* FILE LIST */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {filteredFiles.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
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
                        padding: '10px',
                        borderRadius: '10px',
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
                            fontSize: '0.84rem',
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
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
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{file.size}</span>
                        </div>

                        {isSelected && stat && (
                          <div style={{ marginTop: '5px', fontSize: '0.72rem', fontWeight: 600 }}>
                            {stat.loading ? (
                              <span style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Extrayendo texto del documento...
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
          </div>

          {/* RIGHT PANEL: AI CHAT */}
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--bg-card)' }}>
            {/* SELECTED FILES BAR & QUICK CHIPS */}
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-color)',
                background: 'var(--bg-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  Analizando:
                </span>
                {selectedFiles.length === 0 ? (
                  <span style={{ fontSize: '0.78rem', color: 'var(--danger)', fontWeight: 600 }}>
                    Ningún archivo seleccionado (marca al menos uno a la izquierda)
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
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}
                    >
                      <FileText size={12} />
                      {f.name}
                      <button
                        type="button"
                        onClick={() => toggleFileSelection(f.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex'
                        }}
                        title="Quitar de la selección"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* QUICK ACTION BUTTONS */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {quickPrompts.map((qp) => (
                  <button
                    key={qp.label}
                    type="button"
                    disabled={isThinking || selectedFiles.length === 0}
                    onClick={() => handleSendQuestion(qp.prompt)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '999px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-main)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
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
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
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
                          src="/box-ia-icon.png"
                          alt="Box IA"
                          style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                        />
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--primary)' }}>
                          Box IA
                        </span>
                      </div>
                    )}
                    <div
                      style={{
                        maxWidth: '88%',
                        padding: '12px 15px',
                        borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        background: isUser ? 'var(--primary)' : 'var(--bg-subtle)',
                        color: isUser ? '#fff' : 'var(--text-main)',
                        border: isUser ? 'none' : '1px solid var(--border-color)',
                        fontSize: '0.88rem',
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
                                gap: '8px',
                                fontSize: '0.72rem',
                                color: 'var(--text-muted)'
                              }}
                            >
                              <span>
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

            {/* INPUT FORM */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendQuestion();
              }}
              style={{
                padding: '12px 16px',
                borderTop: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
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
                    ? `Pregunta lo que quieras sobre ${selectedFiles.length === 1 ? `"${selectedFiles[0].name}"` : `los ${selectedFiles.length} archivos seleccionados`}...`
                    : 'Selecciona primero un archivo a la izquierda...'
                }
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-body)',
                  color: 'var(--text-main)',
                  fontSize: '0.88rem',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={!question.trim() || isThinking || selectedFiles.length === 0}
                className="btn-primary"
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: !question.trim() || isThinking || selectedFiles.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: !question.trim() || isThinking || selectedFiles.length === 0 ? 0.6 : 1
                }}
              >
                <Send size={15} />
                <span>Preguntar</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoxIAAgentModal;
