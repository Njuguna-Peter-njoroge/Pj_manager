interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

interface LoginResponse {
  access_token: string;
  user: {  
    id: string;
    email: string;
    role: 'ADMIN' | 'USER';
    isActive: boolean;  
    createdAt: string; 
    updatedAt: string; 
  };
}

interface RegisterDto {
  name: string;
  email: string;
  password: string;
 
}

interface RegisterResponse {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  profileImage: string | null;
}

interface LoginDto {
  email: string;
  password: string;
}

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm') as HTMLFormElement;
  const emailInput = document.getElementById('loginEmail') as HTMLInputElement;
  const passwordInput = document.getElementById('loginPassword') as HTMLInputElement;
  const errorElement = document.getElementById('loginError') as HTMLParagraphElement;
  const registerForm = document.getElementById('registerForm') as HTMLFormElement;
  const nameInput = document.getElementById('registerName') as HTMLInputElement;
  const registerEmail = document.getElementById('registerEmail') as HTMLInputElement;
  const registerPassword = document.getElementById('registerPassword') as HTMLInputElement;
  const confirmPassword = document.getElementById('confirmPassword') as HTMLInputElement;
  const registerError = document.getElementById('registerError') as HTMLParagraphElement;


if (registerForm) {
  registerForm.addEventListener('submit', async (e: Event) => {
    e.preventDefault();
    registerError.textContent = '';

    const name = nameInput.value.trim();
    const email = registerEmail.value.trim();
    const password = registerPassword.value;
    const confirm = confirmPassword.value;

    if (password !== confirm) {
      registerError.textContent = 'Passwords do not match';
      return;
    }

    const payload: RegisterDto = { name, email, password };
    const submitButton = registerForm.querySelector('button[type="submit"]') as HTMLButtonElement;

    submitButton.disabled = true;
    submitButton.innerHTML = 'Registering...';

    try {
      const res = await fetch('http://localhost:3000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseData: ApiResponse<RegisterResponse> = await res.json();

      if (!res.ok) {
        throw new Error(responseData.message || 'Registration failed');
      }

      // Clear the form
      registerForm.reset();

      // Show success message
      const successMessage = document.createElement('p');
      successMessage.className = 'success-message';
      successMessage.textContent = 'Registration successful! Please login to continue.';
      registerForm.insertBefore(successMessage, registerForm.firstChild);

      // Switch to login tab
      const loginTab = document.querySelector('[data-tab="login"]') as HTMLButtonElement;
      if (loginTab) {
        loginTab.click();
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      registerError.textContent = error.message || 'An error occurred during registration';
      registerError.classList.add('show');
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = '<i class="fas fa-user-plus"></i> Register';
    }
  });
}

  if (!loginForm || !emailInput || !passwordInput || !errorElement) {
    console.error('Required form elements not found');
    return;
  }

  loginForm.addEventListener('submit', async (e: Event) => {
    e.preventDefault();
    errorElement.textContent = '';

    const payload: LoginDto = {
      email: emailInput.value,
      password: passwordInput.value,
    };

    const submitButton = loginForm.querySelector('button[type="submit"]') as HTMLButtonElement;
    submitButton.disabled = true;
    submitButton.innerHTML = 'Logging in...';

    try {
      const res = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData: ApiResponse<LoginResponse> = await res.json();

      if (!res.ok) {
        throw new Error(responseData.message || 'Login failed');
      }

      if (!responseData.data) {
        throw new Error('Invalid response format');
      }

      const { access_token, user } = responseData.data; 

      localStorage.setItem('token', access_token);
      localStorage.setItem('role', user.role);
      localStorage.setItem('userId', user.id);
      localStorage.setItem('userEmail', user.email);

      if (user.role === 'ADMIN') {
        window.location.href = 'admin.html'; 
      } else {
        window.location.href = 'user.html'; 
      }
    } catch (error: any) {
      console.error('Login error:', error);
      errorElement.textContent = error.message || 'An error occurred during login';
      errorElement.classList.add('show');
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
    }
  });

  const tabButtons = document.querySelectorAll<HTMLButtonElement>('.tab-btn');
  const forms = document.querySelectorAll<HTMLFormElement>('.auth-forms form');

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabButtons.forEach((button) => button.classList.remove('active'));
      btn.classList.add('active');

      const tab = btn.dataset.tab;
      if (!tab) return;

      forms.forEach((form) => {
        form.classList.toggle('active', form.id === `${tab}Form`);
      });
    });
  });
});
