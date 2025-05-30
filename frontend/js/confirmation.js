document.getElementById('confirm').addEventListener('click', () => {
    alert('Agendamento confirmado! Redirecionando...');
    window.location.href = 'feedback.html';
});

document.getElementById('review').addEventListener('click', () => {
    alert('Voltando para revisar...');
    window.location.href = 'services.html';
});