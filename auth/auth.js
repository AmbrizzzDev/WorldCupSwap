const signUpLink = document.querySelector('.sign-up-link');
const logInLink = document.querySelector('.log-in-link');
const loginForm = document.querySelector('.login');
const signupForm = document.querySelector('.signup');

signUpLink.addEventListener('click', () => {
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
});

logInLink.addEventListener('click', () => {
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});