import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from './Login';

const authState = {
  refresh: vi.fn(),
  error: null as string | null,
};

vi.mock('../AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('../api', () => ({
  api: {
    firebaseLogin: vi.fn(),
    firebaseSignup: vi.fn(),
    firebaseReset: vi.fn(),
    googleLoginUrl: () => '/api/auth/google/login',
  },
}));

import { api } from '../api';

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/app/overview" element={<h1>Overview page</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('switches between sign-in and create-account tabs', () => {
    renderLogin();

    fireEvent.click(screen.getAllByRole('button', { name: /^Create account$/ })[0]);

    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /^Sign in$/ })[0]);

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Confirm password')).not.toBeInTheDocument();
  });

  it('shows validation messages for invalid email and mismatched signup passwords', () => {
    renderLogin();

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'long-enough' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /^Sign in$/ })[1]);

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address.');

    fireEvent.click(screen.getAllByRole('button', { name: /^Create account$/ })[0]);
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password1' },
    });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'password2' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /^Create account$/ })[1]);

    expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match.');
  });

  it('toggles password visibility', () => {
    renderLogin();
    const password = screen.getByLabelText('Password');

    expect(password).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(password).toHaveAttribute('type', 'password');
  });

  it('shows the email-verification notice after successful signup', async () => {
    vi.mocked(api.firebaseSignup).mockResolvedValue({
      message: 'Account created! Check your email and verify your address before logging in.',
    });
    renderLogin();

    fireEvent.click(screen.getAllByRole('button', { name: /^Create account$/ })[0]);
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password1' },
    });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'password1' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /^Create account$/ })[1]);

    expect(await screen.findByRole('status')).toHaveTextContent('verify your address');
  });
});
