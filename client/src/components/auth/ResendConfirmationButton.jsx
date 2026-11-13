import React, { useState, useEffect } from 'react';
import { Loader2, Send } from 'lucide-react';
import { authService } from '../../services/authService.js';

const ESPERA_SEGUNDOS = 60;

/**
 * RF-02: vuelve a enviar el correo de confirmación de la cuenta.
 * Después de cada envío espera un minuto antes de permitir otro (Supabase también lo limita).
 */
export const ResendConfirmationButton = ({ email, startWithCooldown = false, style }) => {
  const [restante, setRestante] = useState(startWithCooldown ? ESPERA_SEGUNDOS : 0);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null); // { tipo: 'ok' | 'error', texto }

  useEffect(() => {
    if (restante <= 0) return undefined;
    const t = setTimeout(() => setRestante((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [restante]);

  const reenviar = async () => {
    if (!email || enviando || restante > 0) return;
    setEnviando(true);
    setMensaje(null);
    const { success, error } = await authService.resendConfirmation(email);
    setEnviando(false);
    if (success) {
      setMensaje({ tipo: 'ok', texto: `Listo, te enviamos otro enlace a ${email}.` });
      setRestante(ESPERA_SEGUNDOS);
    } else {
      setMensaje({ tipo: 'error', texto: error });
    }
  };

  return (
    <div style={style}>
      <button
        type="button"
        onClick={reenviar}
        disabled={enviando || restante > 0 || !email}
        className="btn-secondary"
        style={{ width: '100%', padding: '9px 12px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
      >
        {enviando ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={15} />}
        {restante > 0 ? `Reenviar correo (${restante} s)` : 'Reenviar correo de confirmación'}
      </button>
      {mensaje && (
        <p role="status" style={{ margin: '6px 0 0', fontSize: '0.78rem', color: mensaje.tipo === 'ok' ? 'var(--success)' : 'var(--danger)' }}>
          {mensaje.texto}
        </p>
      )}
    </div>
  );
};

export default ResendConfirmationButton;
