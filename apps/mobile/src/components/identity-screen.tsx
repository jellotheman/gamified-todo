import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, ScrollView, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authMessage, identity, type Identity } from '../lib/identity';
import { privateRepository } from '../lib/private-repository';
import TaskScreen from './task-screen';
import { Action, Field, fieldProps, Loading, PageHeading, ui as styles } from './frontend';


function Notice({ text }: { text: string }) {
  return <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>{text}</Text>;
}

function AuthForm() {
  const [mode, setMode] = useState<'signIn' | 'register' | 'reset'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(true);
  const passwordInput = useRef<{ focus: () => void } | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  function changeMode(next: typeof mode) {
    setMode(next); setError(''); setMessage(''); setPassword('');
  }

  async function submit() {
    if (busy.current) return;
    setError(''); setMessage('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 254) {
      setError('Enter a valid email address.'); return;
    }
    if (mode !== 'reset' && (!password || (mode === 'register' && password.length < 6))) {
      setError(mode === 'register' ? 'Use a password with at least 6 characters.' : 'Enter your password.'); return;
    }
    busy.current = true; setPending(true);
    try {
      if (mode === 'reset') {
        await identity.resetPassword(email);
        if (mounted.current) setMessage('If an account exists for this email, you will receive a password reset link.');
      } else if (mode === 'register') await identity.register(email, password);
      else await identity.signIn(email, password);
    } catch (reason) {
      if (mounted.current) setError(mode === 'reset' ? 'Unable to request a reset email. Check your connection and try again.' : authMessage(reason));
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  }

  const heading = mode === 'register' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Welcome back';
  return <View style={[styles.panel, styles.frame, { maxWidth: 440 }]}>
    <PageHeading>{heading}</PageHeading>
    <Text style={styles.label}>Email</Text>
    <Field {...fieldProps} accessibilityLabel="Email" value={email} onChangeText={setEmail} editable={!pending}
      autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email"
      textContentType="emailAddress" returnKeyType={mode === 'reset' ? 'go' : 'next'}
      onSubmitEditing={mode === 'reset' ? () => void submit() : () => passwordInput.current?.focus()} />
    {mode !== 'reset' && <>
      <Text style={styles.label}>Password</Text>
      <Field {...fieldProps} ref={(input: { focus: () => void } | null) => { passwordInput.current = input; }} accessibilityLabel="Password" value={password} onChangeText={setPassword} editable={!pending}
        secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
        textContentType={mode === 'register' ? 'newPassword' : 'password'} returnKeyType="go"
        onSubmitEditing={() => void submit()} />
      {mode === 'register' && <Text style={styles.copy}>Use at least 6 characters. A longer, unique password is better.</Text>}
    </>}
    {error ? <Notice text={error} /> : null}
    {message ? <Text accessibilityLiveRegion="polite" style={styles.copy}>{message}</Text> : null}
    {pending && <Loading text="Working…" />}
    <Action title={mode === 'reset' ? 'Send reset email' : mode === 'register' ? 'Register' : 'Sign in'}
      primary busy={pending} disabled={pending} onPress={() => void submit()} />
    {mode === 'signIn' && <Action title="Create an account" disabled={pending} onPress={() => changeMode('register')} />}
    {mode !== 'reset' && <Action title="Forgot password?" disabled={pending} onPress={() => changeMode('reset')} />}
    {mode !== 'signIn' && <Action title="Back to sign in" disabled={pending} onPress={() => changeMode('signIn')} />}
  </View>;
}

function PrivateAccount({ user, onLeave, initialAccountOpen }: { user: Identity; onLeave: () => void; initialAccountOpen: boolean }) {
  const [accountOpen, setAccountOpen] = useState(initialAccountOpen);
  const [repository, setRepository] = useState<ReturnType<typeof privateRepository> | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let stop = () => {};
    const fail = () => { if (active) { setReady(false); setError('Unable to load your private account. Check your connection and retry.'); } };
    try {
      const repository = privateRepository(user.uid);
      void repository.ensureProfile().then(() => {
        if (!active) return;
        stop = repository.subscribeProfile(() => { if (active) { setRepository(repository); setReady(true); setError(''); } }, fail);
      }).catch(fail);
    } catch { fail(); }
    return () => { active = false; stop(); };
  }, [user.uid, attempt]);
  return <View style={styles.panel}>
    <View style={styles.header}><PageHeading>{accountOpen ? 'Account' : 'Tasks'}</PageHeading>
      <Action title={accountOpen ? 'Back to tasks' : 'Account'} onPress={() => setAccountOpen(!accountOpen)} /></View>
    {accountOpen ? <View style={styles.frame}>
      <Text style={styles.label}>Signed in as</Text><Text style={styles.copy}>{user.email || 'Email address unavailable.'}</Text>
      <Action title="Sign out" danger onPress={onLeave} />
    </View> : null}
    {error ? <><Notice text={error} /><Action title="Retry account loading" onPress={() => { setReady(false); setError(''); setAttempt(attempt + 1); }} /></>
      : !ready ? <Loading text="Loading your private account…" /> : null}
    <View style={accountOpen ? { display: 'none' } : undefined} accessibilityElementsHidden={accountOpen}
      importantForAccessibility={accountOpen ? 'no-hide-descendants' : 'auto'}>
      {ready && repository ? <TaskScreen key={user.uid} repository={repository} /> : null}
    </View>
  </View>;
}

export default function IdentityScreen() {
  const [user, setUser] = useState<Identity | null | undefined>(undefined);
  const [sessionError, setSessionError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [returnToAccount, setReturnToAccount] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const signOutBusy = useRef(false);
  const mounted = useRef(true);
  const generation = useRef(0);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    const stop = identity.observe((next) => {
      if (!active) return;
      generation.current++;
      setUser(next); setReturnToAccount(false); setSessionError(''); setSigningOut(false); setSignOutError('');
    }, () => { if (active) setSessionError('Unable to restore your session. Please retry.'); });
    return () => { active = false; stop(); };
  }, [attempt]);

  async function leave() {
    if (signOutBusy.current) return;
    signOutBusy.current = true;
    const started = generation.current;
    setSigningOut(true); setSignOutError('');
    try { await identity.signOut(); }
    catch (reason) {
      if (mounted.current && generation.current === started) setSignOutError(authMessage(reason));
    } finally { signOutBusy.current = false; }
  }

  return <SafeAreaView style={styles.page}>
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container}>
        {sessionError ? <View><Notice text={sessionError} /><Action title="Retry session restoration" onPress={() => {
          setUser(undefined); setSessionError(''); setAttempt(attempt + 1);
        }} /></View>
          : user === undefined ? <Loading text="Restoring your session…" />
          : signingOut ? <View>
            {signOutError ? <><Notice text={signOutError} /><Action title="Retry sign out" onPress={() => void leave()} />
              <Action title="Return to account" onPress={() => { setReturnToAccount(true); setSigningOut(false); setSignOutError(''); }} /></>
              : <Loading text="Signing out…" />}
          </View>
          : user ? <PrivateAccount key={user.uid} user={user} initialAccountOpen={returnToAccount} onLeave={() => void leave()} /> : <AuthForm key="signed-out" />}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
