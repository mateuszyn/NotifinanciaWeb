import { useAuth } from '../context/AuthContext';

export default function LoginModal() {
  const { signInWithGoogle } = useAuth();

  return (
    <div 
      className="modal fade" 
      id="loginModal" 
      tabIndex="-1" 
      aria-labelledby="loginModalLabel" 
      aria-hidden="true" 
      data-bs-backdrop="true"
      data-bs-keyboard="false"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content bg-dark border border-secondary shadow-lg">
          <div className="modal-header border-bottom border-secondary">
            <h5 className="modal-title fw-bold text-success" id="loginModalLabel">Notifinancia</h5>
            <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Fechar"></button>
          </div>
          <div className="modal-body text-center p-5">
            <h3 className="fw-bold text-white mb-3">Notificações do Seu portfólio.</h3>
            
            <p className="text-secondary mb-4">Gerencie sua carteira de <strong>Ações e FIIs</strong>. Acesse gratuitamente para receber <strong>relatórios diários de dividendos da B3 às 18h</strong> e alertas de preço médio por e-mail.</p>
            
            <button 
              onClick={signInWithGoogle}
              className="btn btn-outline-light w-100 py-3 fw-bold d-flex align-items-center justify-content-center gap-2"
            >
              <i className="bi bi-google text-success fs-5"></i> Acessar com Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
