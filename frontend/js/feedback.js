document.getElementById('feedbackForm').addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Feedback enviado! Obrigado!');
    window.location.href = 'index.html';
});