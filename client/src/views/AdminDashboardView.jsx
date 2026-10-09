import React, { useState, useEffect } from 'react';
import {
  LogOut, Search, Loader2, Users, HardDrive, DollarSign,
  Shield, UserCheck, UserX, RefreshCw
} from 'lucide-react';
import { adminService } from '../services/adminService.js';

const ROLES = { 1: 'Administrador', 2: 'Cliente' };

function formatBytes(bytes, decimals = 1) {
  const n = Number(bytes) || 0;
  if (n === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(n) / Math.log(k));
  return parseFloat((n / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

function formatDate(fecha) {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Convierte la fila de Supabase (usuario + almacenamiento + suscripcion) a un objeto plano
 */
function mapUsuario(u) {
  // almacenamiento puede venir como objeto (relación 1 a 1) o como arreglo
  const alm = Array.isArray(u.almacenamiento) ? u.almacenamiento[0] : u.almacenamiento;
  const subs = u.suscripcion || [];
  const activeSub = subs.find(s => s.estado === 'activa') || subs[0];

  const usado = Number(alm?.espacio_usado_bytes || 0);
  const total = Number(alm?.capacidad_total_bytes || 0);

  return {
    id: u.id_usuario,
    name: [u.nombre, u.apellido].filter(Boolean).join(' ') || 'Sin nombre',
    idRol: u.id_rol,
    rol: ROLES[u.id_rol] || 'Cliente',
    estado: u.estado || 'activo',
    plan: activeSub?.plan?.nombre || 'Sin plan',
    usado,
    total,
    percent: total > 0 ? Math.min(100, (usado / total) * 100) : 0,
    registro: formatDate(u.fecha_registro)
  };
}

export const AdminDashboardView = ({ currentUser, onLogout, onNotification }) => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ totalUsuarios: 0, espacioTotal: 0, ingresos: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'admins' | 'clientes' | 'suspendidos'
  const [busyUserId, setBusyUserId] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersData, statsData] = await Promise.all([
        adminService.getUsers(),
        adminService.getStats()
      ]);
      setUsers((usersData || []).map(mapUsuario));
      setStats(statsData);
    } catch (err) {
      console.error('Error al cargar datos del panel:', err);
      onNotification && onNotification(`Error al cargar el panel: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Suspender / activar usuario
  const handleToggleStatus = async (user) => {
    const nuevoEstado = user.estado === 'suspendido' ? 'activo' : 'suspendido';
    const accion = nuevoEstado === 'suspendido' ? 'suspender' : 'activar';
    if (!window.confirm(`¿Seguro que quieres ${accion} a ${user.name}?`)) return;

    setBusyUserId(user.id);
    try {
      const { error } = await adminService.setUserStatus(user.id, nuevoEstado);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, estado: nuevoEstado } : u));
      onNotification && onNotification(`${user.name} ahora está ${nuevoEstado}.`, 'success');
    } catch (err) {
      onNotification && onNotification(`No se pudo ${accion} al usuario: ${err.message}`, 'error');
    } finally {
      setBusyUserId(null);
    }
  };

  // Cambiar rol Administrador <-> Cliente
  const handleToggleRole = async (user) => {
    const nuevoRol = user.idRol === 1 ? 2 : 1;
    if (!window.confirm(`¿Cambiar el rol de ${user.name} a ${ROLES[nuevoRol]}?`)) return;

    setBusyUserId(user.id);
    try {
      const { error } = await adminService.setUserRole(user.id, nuevoRol);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, idRol: nuevoRol, rol: ROLES[nuevoRol] } : u));
      onNotification && onNotification(`${user.name} ahora es ${ROLES[nuevoRol]}.`, 'success');
    } catch (err) {
      onNotification && onNotification(`No se pudo cambiar el rol: ${err.message}`, 'error');
    } finally {
      setBusyUserId(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filter === 'all' ? true :
      filter === 'admins' ? u.idRol === 1 :
      filter === 'clientes' ? u.idRol === 2 :
      u.estado === 'suspendido';
    return matchesSearch && matchesFilter;
  });

  const suspendidos = users.filter(u => u.estado === 'suspendido').length;

  const statCards = [
    { label: 'Usuarios registrados', value: stats.totalUsuarios ?? users.length, icon: <Users size={20} />, color: 'var(--primary)' },
    { label: 'Almacenamiento usado', value: formatBytes(stats.espacioTotal), icon: <HardDrive size={20} />, color: 'var(--accent-cyan)' },
    { label: 'Ingresos totales', value: `$${Number(stats.ingresos || 0).toFixed(2)}`, icon: <DollarSign size={20} />, color: 'var(--success)' },
    { label: 'Cuentas suspendidas', value: suspendidos, icon: <UserX size={20} />, color: 'var(--danger)' }
  ];

  const actionButtonStyle = {
    padding: '6px 10px',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.78rem',
    fontWeight: 700,
    transition: 'all 0.15s ease'
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-subtle)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <header
        style={{
          background: 'var(--bg-body)',
          borderBottom: '1px solid var(--border-color)',
          padding: '0.85rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img
              src="/logo.png"
              alt="Nimbox Logo"
              style={{
                width: '34px',
                height: '34px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 2px 6px rgba(99, 102, 241, 0.25))'
              }}
            />
            <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
              Nimbox<span style={{ color: 'var(--primary)' }}>.</span>
            </span>
          </div>

          <span
            style={{
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Shield size={12} /> Panel de Administración
          </span>
        </div>

        {/* User Info & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem',
              border: '2px solid var(--text-white)',
              boxShadow: 'var(--shadow-sm)'
            }}
            title={currentUser?.email}
          >
            {(currentUser?.name || currentUser?.email || 'A')[0].toUpperCase()}
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="btn-secondary"
            style={{
              padding: '6px 14px',
              fontSize: '0.85rem',
              borderRadius: 'var(--radius-sm)',
              gap: '6px'
            }}
          >
            <LogOut size={15} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* Main */}
      <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {/* Welcome Banner */}
        <div
          style={{
            background: 'var(--bg-hero-banner)',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            color: 'var(--text-white)',
            marginBottom: '2rem',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <span style={{ background: 'var(--white-alpha-20)', padding: '2px 8px', borderRadius: 'var(--radius-xs)', fontSize: '0.75rem', fontWeight: 600 }}>
            ADMINISTRADOR
          </span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '8px 0 6px 0' }}>
            Hola, {currentUser?.name || 'Administrador'}
          </h2>
          <p style={{ opacity: 0.85, fontSize: '0.9rem', maxWidth: '560px', margin: 0 }}>
            Desde aquí puedes ver el estado general de Nimbox y gestionar las cuentas de los usuarios: suspenderlas, reactivarlas o cambiar su rol.
          </p>
        </div>

        {/* Stat Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '2rem'
          }}
        >
          {statCards.map((card) => (
            <div
              key={card.label}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-hover)',
                  color: card.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {card.icon}
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block' }}>
                  {card.label}
                </span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {isLoading ? '…' : card.value}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '1.5rem'
          }}
        >
          {/* Filtros */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-card)',
              padding: '4px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              gap: '4px'
            }}
          >
            {[
              { id: 'all', label: 'Todos' },
              { id: 'clientes', label: 'Clientes' },
              { id: 'admins', label: 'Administradores' },
              { id: 'suspendidos', label: 'Suspendidos' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: filter === tab.id ? 'var(--primary)' : 'transparent',
                  color: filter === tab.id ? 'var(--text-white)' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Buscar */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Buscar usuario..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '8px 12px 8px 34px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-body)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  width: '200px'
                }}
              />
              <Search size={16} color="var(--text-light)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            {/* Recargar */}
            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="btn-secondary"
              style={{ padding: '8px 12px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', gap: '6px' }}
              title="Recargar datos"
            >
              <RefreshCw size={15} style={isLoading ? { animation: 'spin 1s linear infinite' } : undefined} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          {isLoading ? (
            <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Loader2 size={36} style={{ margin: '0 auto 12px auto', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>Cargando usuarios...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Users size={44} style={{ margin: '0 auto 12px auto', opacity: 0.35 }} />
              <h4 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', marginBottom: '4px' }}>No se encontraron usuarios</h4>
              <p style={{ fontSize: '0.85rem', margin: 0 }}>Ajusta la búsqueda o los filtros.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '860px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '12px 20px', fontWeight: 600 }}>Usuario</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Rol</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Plan</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Almacenamiento</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Estado</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Registro</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600, textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const isMe = user.id === currentUser?.id;
                    const isBusy = busyUserId === user.id;
                    const isSuspended = user.estado === 'suspendido';

                    return (
                      <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)', opacity: isSuspended ? 0.7 : 1 }}>
                        {/* Usuario */}
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: 'var(--radius-full)',
                                background: user.idRol === 1 ? 'var(--danger-bg)' : 'var(--primary-light)',
                                color: user.idRol === 1 ? 'var(--danger)' : 'var(--primary)',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              {user.name[0].toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                              {user.name}
                              {isMe && (
                                <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700 }}>(Tú)</span>
                              )}
                            </span>
                          </div>
                        </td>

                        {/* Rol */}
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: user.idRol === 1 ? 'var(--danger)' : 'var(--text-muted)',
                              background: user.idRol === 1 ? 'var(--danger-bg)' : 'var(--bg-hover)'
                            }}
                          >
                            {user.idRol === 1 && <Shield size={11} />}
                            {user.rol}
                          </span>
                        </td>

                        {/* Plan */}
                        <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {user.plan}
                        </td>

                        {/* Almacenamiento */}
                        <td style={{ padding: '14px 16px', minWidth: '170px' }}>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                            {formatBytes(user.usado)} / {user.total ? formatBytes(user.total, 0) : '—'}
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${Math.max(user.percent, user.usado > 0 ? 1 : 0)}%`,
                                height: '100%',
                                background: user.percent > 90 ? 'var(--danger)' : 'var(--success)',
                                borderRadius: 'var(--radius-full)'
                              }}
                            />
                          </div>
                        </td>

                        {/* Estado */}
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              color: isSuspended ? 'var(--danger)' : 'var(--success)',
                              background: isSuspended ? 'var(--danger-bg)' : 'rgba(16, 185, 129, 0.1)'
                            }}
                          >
                            {isSuspended ? 'Suspendido' : 'Activo'}
                          </span>
                        </td>

                        {/* Registro */}
                        <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {user.registro}
                        </td>

                        {/* Acciones */}
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          {isMe ? (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>—</span>
                          ) : (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              {isBusy && <Loader2 size={16} color="var(--text-muted)" style={{ animation: 'spin 1s linear infinite' }} />}

                              {/* Suspender / Activar */}
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleToggleStatus(user)}
                                style={{
                                  ...actionButtonStyle,
                                  color: isSuspended ? 'var(--success)' : 'var(--danger)',
                                  background: isSuspended ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                  border: isSuspended ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.2)',
                                  opacity: isBusy ? 0.5 : 1
                                }}
                                title={isSuspended ? 'Reactivar cuenta' : 'Suspender cuenta'}
                              >
                                {isSuspended ? <UserCheck size={14} /> : <UserX size={14} />}
                                <span>{isSuspended ? 'Activar' : 'Suspender'}</span>
                              </button>

                              {/* Cambiar rol */}
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleToggleRole(user)}
                                style={{
                                  ...actionButtonStyle,
                                  color: 'var(--primary)',
                                  background: 'var(--primary-light)',
                                  border: '1px solid rgba(99, 102, 241, 0.3)',
                                  opacity: isBusy ? 0.5 : 1
                                }}
                                title="Cambiar rol"
                              >
                                <Shield size={14} />
                                <span>{user.idRol === 1 ? 'Quitar admin' : 'Hacer admin'}</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboardView;