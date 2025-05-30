import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, fetchSignInMethodsForEmail } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const auth = window.auth;
const db = window.db;

try {
    if (!auth || !db) throw new Error('Firebase não inicializado');

    document.getElementById('showRegister').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
        document.getElementById('loginError').style.display = 'none';
    });

    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerError').style.display = 'none';
    });

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (!userDoc.exists()) {
                throw new Error('Usuário não encontrado no Firestore');
            }
            errorDiv.style.display = 'none';
            if (userDoc.data().role === 'manager') {
                window.location.href = 'manager.html';
            } else {
                window.location.href = 'services.html';
            }
        } catch (error) {
            console.error('Erro no login:', error);
            errorDiv.textContent = error.code === 'auth/invalid-credential'
                ? 'Credenciais inválidas. Tente novamente ou cadastre-se.'
                : 'Erro ao fazer login: ' + error.message;
            errorDiv.style.display = 'block';
        }
    });

    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const phone = document.getElementById('phone').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const errorDiv = document.getElementById('registerError');

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await setDoc(doc(db, 'users', user.uid), {
                id: user.uid,
                name: name,
                phone: phone,
                email: email,
                role: 'client'
            });
            errorDiv.style.display = 'none';
            window.location.href = 'services.html';
        } catch (error) {
            console.error('Erro no cadastro:', error);
            errorDiv.textContent = 'Erro ao cadastrar: ' + error.message;
            errorDiv.style.display = 'block';
        }
    });

    document.getElementById('resetPassword').addEventListener('click', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const errorDiv = document.getElementById('loginError');

        if (!email) {
            errorDiv.textContent = 'Por favor, insira um e-mail para redefinir a senha.';
            errorDiv.style.display = 'block';
            errorDiv.style.color = 'red';
            return;
        }

        try {
            const signInMethods = await fetchSignInMethodsForEmail(auth, email);
            if (signInMethods.length === 0) {
                errorDiv.textContent = 'E-mail não cadastrado. Por favor, faça o cadastro.';
                errorDiv.style.display = 'block';
                errorDiv.style.color = 'red';
                return;
            }

            await sendPasswordResetEmail(auth, email);
            errorDiv.textContent = 'E-mail de redefinição de senha enviado! Verifique sua caixa de entrada.';
            errorDiv.style.display = 'block';
            errorDiv.style.color = 'green';
        } catch (error) {
            console.error('Erro ao enviar e-mail de redefinição:', error);
            errorDiv.textContent = 'Erro ao processar solicitação: ' + error.message;
            errorDiv.style.display = 'block';
            errorDiv.style.color = 'red';
        }
    });
} catch (error) {
    console.error('Erro ao inicializar script:', error);
    document.getElementById('loginError').textContent = 'Erro ao carregar a página: ' + error.message;
    document.getElementById('loginError').style.display = 'block';
}