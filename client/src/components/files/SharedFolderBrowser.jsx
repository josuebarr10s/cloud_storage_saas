import React, { useState, useEffect, useRef } from 'react';
import {
  Folder, FileText, Image as ImageIcon, Video, Music, Archive, FileCode,
  Eye, Download, Upload, FolderPlus, Trash2, ChevronRight, Loader2, RefreshCw, Edit2
} from 'lucide-react';
import { sharingService, SHARE_PERMISSIONS } from '../../services/sharingService.js';
import { filesService } from '../../services/filesService.js';
import { FilePreviewModal } from './FilePreviewModal.jsx';
import { CreateFolderModal } from './CreateFolderModal.jsx';
import { RenameModal } from './RenameModal.jsx';

const ICONS_BY_TYPE = {
  image: ImageIcon,
  video: Video,
  audio: Music,
  zip: Archive,
  code: FileCode,
};

export const getFileIconByType = (type) => ICONS_BY_TYPE[type] || FileText;

/**
 * Explorador de una carpeta compartida por enlace. Con permiso de editor permite subir
 * archivos y versiones nuevas, crear subcarpetas y mandar archivos a la papelera del dueño
 * (todo a nombre del dueño: ownerId).
 */
export const SharedFolderBrowser = ({ rootFolder, ownerId, permission, onNotification }) => {
  const [path, setPath] = useState([rootFolder]);
  const [contents, setContents] = useState({ folders: [], files: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  const uploadInputRef = useRef(null);
  const versionInputRef = useRef(null);
  const versionTargetRef = useRef(null);

  const isEditor = permission === SHARE_PERMISSIONS.EDITOR;
  const currentFolder = path[path.length - 1];

  const loadContents = async () => {
    setIsLoading(true);
    try {
      setContents(await sharingService.getSharedFolderContents(currentFolder.id));
    } catch (err) {
      onNotification && onNotification(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContents();
  }, [currentFolder.id]);

  // Envuelve una acción de editor: bloquea botones mientras corre y recarga al terminar
  const runEditorAction = async (action, successMessage) => {
    setIsBusy(true);
    try {
      await action();
      onNotification && onNotification(successMessage, 'success');
    } catch (err) {
      onNotification && onNotification(err.message, 'error');
    } finally {
      setIsBusy(false);
      loadContents();
    }
  };

  const uploadFiles = (fileList) => {
    const selected = Array.from(fileList || []);
    if (selected.length === 0 || isBusy) return;
    runEditorAction(async () => {
      for (const file of selected) {
        await filesService.uploadFile(ownerId, file, currentFolder.id);
      }
    }, selected.length === 1 ? `"${selected[0].name}" se subió a la carpeta.` : `Se subieron ${selected.length} archivos.`);
  };

  const handleUploadFiles = (e) => {
    uploadFiles(e.target.files);
    e.target.value = '';
  };

  // Arrastrar archivos desde la computadora (solo editor)
  const isFileDrag = (e) => Array.from(e.dataTransfer?.types || []).includes('Files');

  const handleDragOver = (e) => {
    if (!isEditor || !isFileDrag(e)) return;
    e.preventDefault();
    setIsDraggingFiles(true);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDraggingFiles(false);
  };

  const handleDrop = (e) => {
    if (!isEditor || !isFileDrag(e)) return;
    e.preventDefault();
    setIsDraggingFiles(false);
    uploadFiles(e.dataTransfer.files);
  };

  const handleRename = async (newName) => {
    await filesService.renameFile(fileToRename, newName);
    onNotification && onNotification(`Ahora se llama "${newName}".`, 'success');
    loadContents();
  };

  const handlePickNewVersion = (file) => {
    versionTargetRef.current = file;
    versionInputRef.current?.click();
  };

  const handleUploadNewVersion = (e) => {
    const newFile = e.target.files?.[0];
    const target = versionTargetRef.current;
    e.target.value = '';
    if (!newFile || !target) return;
    runEditorAction(
      () => filesService.uploadNewVersion(target, newFile, ownerId),
      `Se subió una versión nueva de "${target.name}".`
    );
  };

  const handleMoveToTrash = (file) => {
    if (!window.confirm(`¿Mandar "${file.name}" a la papelera de su dueño?`)) return;
    runEditorAction(() => filesService.moveToTrash(file.id), `"${file.name}" se movió a la papelera.`);
  };

  const handleCreateFolder = ({ name, color }) =>
    runEditorAction(
      () => filesService.createFolder(ownerId, name, color, currentFolder.id),
      `Carpeta "${name}" creada.`
    );

  const handleDownload = async (file) => {
    try {
      await filesService.downloadFile(file.file_path, file.name);
    } catch (err) {
      onNotification && onNotification(`Error al descargar: ${err.message}`, 'error');
    }
  };

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-card)',
    textAlign: 'left'
  };

  const iconButtonStyle = {
    padding: '6px 8px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-muted)',
    background: 'var(--bg-subtle)',
    border: '1px solid var(--border-color)',
    cursor: isBusy ? 'wait' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center'
  };

  const isEmpty = contents.folders.length === 0 && contents.files.length === 0;

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left', position: 'relative' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDraggingFiles && (
        <div
          style={{
            position: 'absolute',
            inset: '-8px',
            zIndex: 5,
            background: 'var(--primary-light)',
            border: '2px dashed var(--primary)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: 'var(--primary)',
            fontWeight: 700,
            pointerEvents: 'none'
          }}
        >
          <Upload size={30} />
          Suelta los archivos para subirlos a "{currentFolder.name}"
        </div>
      )}

      {/* Ruta dentro de la carpeta compartida */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', fontSize: '0.85rem' }}>
        {path.map((folder, index) => (
          <React.Fragment key={folder.id}>
            {index > 0 && <ChevronRight size={14} color="var(--text-light)" />}
            <button
              type="button"
              onClick={() => setPath(path.slice(0, index + 1))}
              disabled={index === path.length - 1}
              style={{
                background: 'none',
                border: 'none',
                padding: '2px 4px',
                cursor: index === path.length - 1 ? 'default' : 'pointer',
                fontWeight: index === path.length - 1 ? 700 : 500,
                color: index === path.length - 1 ? 'var(--text-main)' : 'var(--primary)'
              }}
            >
              {folder.name}
            </button>
          </React.Fragment>
        ))}
        <button type="button" onClick={loadContents} title="Actualizar" style={{ ...iconButtonStyle, marginLeft: 'auto', padding: '4px 6px' }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Acciones de editor */}
      {isEditor && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button type="button" className="btn-primary" onClick={() => uploadInputRef.current?.click()} disabled={isBusy} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            {isBusy ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={16} />}
            Subir archivos
          </button>
          <button type="button" className="btn-secondary" onClick={() => setIsCreateFolderOpen(true)} disabled={isBusy} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <FolderPlus size={16} /> Nueva carpeta
          </button>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
            También puedes arrastrar archivos aquí
          </span>
          <input ref={uploadInputRef} type="file" multiple hidden onChange={handleUploadFiles} />
          <input ref={versionInputRef} type="file" hidden onChange={handleUploadNewVersion} />
        </div>
      )}

      {/* Contenido */}
      {isLoading ? (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader2 size={26} style={{ margin: '0 auto 8px auto', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: '0.85rem', margin: 0 }}>Cargando carpeta...</p>
        </div>
      ) : isEmpty ? (
        <p style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
          Esta carpeta está vacía.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {contents.folders.map(folder => (
            <button
              key={folder.id}
              type="button"
              onClick={() => setPath([...path, folder])}
              style={{ ...rowStyle, cursor: 'pointer' }}
            >
              <Folder size={20} color="var(--primary)" fill="var(--primary)" fillOpacity={0.25} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {folder.name}
              </span>
              <ChevronRight size={16} color="var(--text-light)" />
            </button>
          ))}

          {contents.files.map(file => {
            const FileIcon = getFileIconByType(file.type);
            return (
              <div key={file.id} style={rowStyle}>
                <FileIcon size={20} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {file.size} · {file.updated}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button type="button" onClick={() => setPreviewFile(file)} style={iconButtonStyle} title="Ver">
                    <Eye size={15} />
                  </button>
                  <button type="button" onClick={() => handleDownload(file)} style={iconButtonStyle} title="Descargar">
                    <Download size={15} />
                  </button>
                  {isEditor && (
                    <>
                      <button type="button" onClick={() => setFileToRename(file)} disabled={isBusy} style={iconButtonStyle} title="Cambiar nombre">
                        <Edit2 size={15} />
                      </button>
                      <button type="button" onClick={() => handlePickNewVersion(file)} disabled={isBusy} style={iconButtonStyle} title="Subir versión nueva">
                        <Upload size={15} />
                      </button>
                      <button type="button" onClick={() => handleMoveToTrash(file)} disabled={isBusy} style={{ ...iconButtonStyle, color: 'var(--danger)' }} title="Mandar a la papelera">
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <FilePreviewModal
        file={previewFile}
        isOpen={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
        onNotification={onNotification}
      />

      <RenameModal
        item={fileToRename}
        isOpen={Boolean(fileToRename)}
        onClose={() => setFileToRename(null)}
        onRename={handleRename}
      />

      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        onCreateFolder={handleCreateFolder}
      />
    </div>
  );
};

export default SharedFolderBrowser;
