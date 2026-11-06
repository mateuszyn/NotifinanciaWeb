import { useAuth } from '../context/AuthContext';
import { BROKERS } from '../utils/brokers.js';

export default function Header({ sortBy, onSortChange, broker, onBrokerChange, notificationsEnabled, onToggleNotif }) {
    const { user, isAuthenticated, signOut, signInWithGoogle } = useAuth();
    const isNotifOn = isAuthenticated && notificationsEnabled;

    const rawUserName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';
    const avatarUrl = user?.user_metadata?.avatar_url || '';
    const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(rawUserName)}&background=1a1d29&color=007bff&bold=true`;

    const currentBroker = broker || 'Nubank';
    const brokerInfo = BROKERS[currentBroker] || BROKERS.Nubank;

    const handleNotifClick = async () => {
        if (!isAuthenticated) {
            const result = await window.Swal.fire({
                title: '<i class="bi bi-envelope-paper text-success me-2"></i>Relatórios Diários da Carteira',
                html: '<div class="text-start text-light"><p>O <b>Notifinancia</b> envia diariamente às <b>18h</b> um resumo completo do fechamento do mercado da sua carteira: cotações, proventos creditados e evolução da sua Bola de Neve.</p><p class="text-secondary small mb-0">Faça login com sua conta Google para cadastrar seu e-mail e receber os alertas diários.</p></div>',
                showCancelButton: true,
                confirmButtonText: 'Conectar com Google',
                cancelButtonText: 'Agora não',
                confirmButtonColor: '#198754',
                background: '#1a1d29',
                color: '#ffffff'
            });

            if (result.isConfirmed) {
                window.bootstrap.Modal.getOrCreateInstance(
                    document.getElementById('loginModal')
                ).show();
            }
            return;
        }

        const result = await window.Swal.fire({
            title: notificationsEnabled
                ? 'Gerenciar Notificações Diárias'
                : 'Ativar Relatório Diário (18h)',
            html: '<div class="text-start text-light"><p>No seu e-mail, receba às 18h um resumo do fechamento do mercado, com as cotações, avisos e links rápidos para ação na sua corretora.</p><p>Acompanhar os resultados com regularidade ajuda a manter a disciplina de investimentos e a consistência da sua estratégia de dividendos.</p></div>',
            showCancelButton: true,
            confirmButtonText: notificationsEnabled
                ? 'Desativar Envio às 18h'
                : 'Ativar Envio Diário às 18h',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: notificationsEnabled ? '#dc3545' : '#198754',
            background: '#1a1d29',
            color: '#ffffff'
        });

        if (result.isConfirmed) onToggleNotif?.();
    };

    return (
        <header className="bg-dark px-3 py-3 border-bottom border-secondary">
            <div className="header-container container-fluid p-0 d-flex flex-column flex-lg-row align-items-center justify-content-between gap-2 gap-lg-3">
                
                <div className="header-brand text-center text-lg-start">
                    <button
                        type="button"
                        className={`header-brand-btn ${isNotifOn
                            ? 'border border-success bg-dark shadow-sm is-active'
                            : 'border border-danger bg-dark shadow-sm is-disabled'}`}
                        onClick={handleNotifClick}
                        aria-label={isNotifOn
                            ? 'Gerenciar relatório diário da carteira'
                            : 'Ativar relatório diário da carteira'}
                    >
                        <span className="header-brand-icon" aria-hidden="true">
                            <i className={`bi ${isNotifOn
                                ? 'bi-envelope-check-fill text-success'
                                : 'bi-envelope-x text-danger pulse-attention'}`}></i>
                            <i className={`bi bi-bell-fill header-brand-bell ${isNotifOn
                                ? 'text-success'
                                : 'text-danger'}`}></i>
                        </span>
                        <span className="header-brand-copy">
                            <span className={`fw-bold title-responsive ${isNotifOn ? 'text-success' : 'text-danger'}`}>
                                NOTIFINANCIA
                            </span>
                            <span
                                className={`small fw-semibold d-block subtitle-responsive ${isNotifOn ? 'text-success' : 'text-danger'}`}
                                style={{ fontSize: '0.65rem' }}
                            >
                                {isNotifOn ? 'Relatório Diário • 18h' : 'Relatório Diário • Desativado'}
                            </span>
                        </span>
                    </button>
                </div>

                {/* Filtros centrais */}
                <div className="d-flex flex-row gap-2 justify-content-center filter-container">
                    <select
                        id="sort-select"
                        className="form-select bg-dark text-white border-secondary form-select-sm"
                        value={sortBy || 'pm_asc'}
                        onChange={e => onSortChange && onSortChange(e.target.value)}
                    >
                        <option value="pm_asc">P.M. (Menor %)</option>
                        <option value="pm_desc">P.M. (Maior %)</option>
                        <option value="name_asc">Nome (A-Z)</option>
                        <option value="name_desc">Nome (Z-A)</option>
                        <option value="total_desc">Valor Total ↓</option>
                        <option value="total_asc">Valor Total ↑</option>
                        <option value="day_desc">Dia (Melhor)</option>
                        <option value="day_asc">Dia (Pior)</option>
                    </select>

                    <select
                        id="broker-select"
                        className="form-select border-secondary form-select-sm"
                        style={{ backgroundColor: brokerInfo.color, color: brokerInfo.textColor, fontWeight: 'bold' }}
                        value={currentBroker}
                        onChange={e => onBrokerChange && onBrokerChange(e.target.value)}
                    >
                        {Object.keys(BROKERS).map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                </div>

                {/* Ações à direita */}
                <div className="d-flex align-items-center justify-content-center gap-3 actions-container">
                    
                    {/* Menu do Usuário ou Botão Entrar */}
                    {!isAuthenticated ? (
                        <button
                            className="btn btn-success btn-sm rounded-pill px-4 fw-bold"
                            onClick={signInWithGoogle}
                        >
                            Entrar
                        </button>
                    ) : (
                        <details className="user-menu">
                            <summary className="user-menu-trigger" aria-label="Abrir menu da conta">
                                <img
                                    src={avatarUrl || fallbackAvatar}
                                    onError={e => { e.target.onerror = null; e.target.src = fallbackAvatar; }}
                                    alt={`Foto de ${rawUserName}`}
                                    className="user-avatar"
                                />
                            </summary>
                            <div className="user-menu-panel">
                                <div className="user-menu-account">
                                    <img
                                        src={avatarUrl || fallbackAvatar}
                                        onError={e => { e.target.onerror = null; e.target.src = fallbackAvatar; }}
                                        alt=""
                                        className="user-menu-avatar"
                                    />
                                    <div>
                                        <strong>{rawUserName}</strong>
                                        <small>{user?.email || ''}</small>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="user-menu-item"
                                    onClick={signInWithGoogle}
                                >
                                    <i className="bi bi-person-lines-fill"></i> Trocar conta
                                </button>
                                <button
                                    type="button"
                                    className="user-menu-item user-menu-logout"
                                    onClick={signOut}
                                >
                                    <i className="bi bi-box-arrow-right"></i> Sair
                                </button>
                            </div>
                        </details>
                    )}
                </div>
            </div>
        </header>
    );
}
