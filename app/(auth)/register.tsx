import { Link, router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { View, type TextInput } from 'react-native';

import {
  confirmProblem,
  emailProblem,
  FixedField,
  FormHeading,
  newPasswordProblem,
  PASSWORD_RULES,
  RoleChoice,
  type SignUpRole,
} from '@/components/auth/forms';
import { authHref, GuestOnly, useRedirectParam } from '@/components/auth/guest';
import { PublicPage } from '@/components/layout/PublicPage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { PasswordField } from '@/components/ui/password-field';
import { Select } from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { TextLink } from '@/components/ui/text-link';
import { authApi, type RegisterBody } from '@/lib/api/auth';
import { isApiError } from '@/lib/api/client';
import { configApi, DEFAULT_APP_CONFIG } from '@/lib/api/config';
import { levelLabel } from '@/lib/format';

type FieldName =
  | 'first_name'
  | 'last_name'
  | 'email'
  | 'student_id'
  | 'current_level'
  | 'current_semester'
  | 'employee_id'
  | 'password'
  | 'confirm';

type Values = Record<FieldName, string>;
type Errors = Partial<Record<FieldName, string>>;

const EMPTY: Values = {
  first_name: '',
  last_name: '',
  email: '',
  student_id: '',
  current_level: '',
  current_semester: '',
  employee_id: '',
  password: '',
  confirm: '',
};

/** Text fields in screen order (the first one with an error gets the focus). */
const FOCUS_ORDER: FieldName[] = ['first_name', 'last_name', 'email', 'student_id', 'employee_id', 'password', 'confirm'];

/** Fields the server may report errors for (the rest go in the notice above the button). */
const SERVER_FIELDS: FieldName[] = [
  'first_name',
  'last_name',
  'email',
  'student_id',
  'current_level',
  'current_semester',
  'employee_id',
  'password',
];

const MAX_STUDENT_ID = 2147483647;

function roleFromParam(raw: string | undefined): SignUpRole | null {
  const value = (raw ?? '').toLowerCase();
  if (value === 'student') return 'STUDENT';
  if (value === 'teacher') return 'TEACHER';
  return null;
}

function validate(role: SignUpRole, values: Values): Errors {
  const errors: Errors = {};
  if (!values.first_name.trim()) errors.first_name = 'Enter your first name.';
  errors.email = emailProblem(values.email);
  if (role === 'STUDENT') {
    const id = values.student_id.trim();
    if (!id) errors.student_id = 'Enter your student ID.';
    else if (!/^\d+$/.test(id)) errors.student_id = 'Use digits only, like 2302001.';
    else if (Number(id) < 1 || Number(id) > MAX_STUDENT_ID) errors.student_id = 'Enter your real student ID, like 2302001.';
    if (!values.current_level) errors.current_level = 'Choose your level.';
    if (!values.current_semester) errors.current_semester = 'Choose your term.';
  } else if (!values.employee_id.trim()) {
    errors.employee_id = 'Enter your employee ID.';
  }
  errors.password = newPasswordProblem(values.password);
  errors.confirm = confirmProblem(values.password, values.confirm);
  return errors;
}

function bodyFor(role: SignUpRole, values: Values): RegisterBody {
  const common = {
    email: values.email.trim(),
    password: values.password,
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
  };
  if (role === 'STUDENT') {
    return {
      role,
      ...common,
      student_id: Number(values.student_id.trim()),
      current_level: values.current_level,
      current_semester: values.current_semester,
    };
  }
  return { role, ...common, employee_id: values.employee_id.trim() };
}

/** /register: Student or Teacher first, then the details. The account waits for an admin. */
export default function RegisterScreen() {
  const params = useLocalSearchParams<{ role?: string }>();
  const role = roleFromParam(params.role);
  const redirect = useRedirectParam();

  const [values, setValues] = React.useState<Values>(EMPTY);
  const [errors, setErrors] = React.useState<Errors>({});
  const [problem, setProblem] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [lists, setLists] = React.useState({ levels: DEFAULT_APP_CONFIG.levels, terms: DEFAULT_APP_CONFIG.terms });
  const refs = React.useRef<Partial<Record<FieldName, TextInput | null>>>({});

  React.useEffect(() => {
    let active = true;
    configApi.appCached().then((config) => {
      if (active && config.levels?.length && config.terms?.length) setLists({ levels: config.levels, terms: config.terms });
    });
    return () => {
      active = false;
    };
  }, []);

  const set = (name: FieldName) => (value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    // An edited field's old error no longer applies.
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const ref = (name: FieldName) => (input: TextInput | null) => {
    refs.current[name] = input;
  };
  const focus = (name: FieldName) => () => refs.current[name]?.focus();

  function chooseRole(next: SignUpRole) {
    router.setParams({ role: next.toLowerCase() });
    setErrors({});
    setProblem(null);
  }

  function focusFirstError(found: Errors) {
    const first = FOCUS_ORDER.find((name) => found[name]);
    if (first) refs.current[first]?.focus();
  }

  async function submit() {
    if (!role || submitting) return;
    const found = validate(role, values);
    setErrors(found);
    setProblem(null);
    if (Object.values(found).some(Boolean)) {
      focusFirstError(found);
      return;
    }
    setSubmitting(true);
    try {
      const body = bodyFor(role, values);
      await authApi.register(body);
      router.replace(authHref('/pending', redirect, { email: body.email.toLowerCase(), created: '1' }));
    } catch (error) {
      setSubmitting(false);
      if (!isApiError(error)) {
        setProblem('Could not create the account. Please try again.');
        return;
      }
      const fromServer: Errors = {};
      for (const name of SERVER_FIELDS) fromServer[name] = error.field(name);
      const known = Object.values(fromServer).some(Boolean);
      setErrors(fromServer);
      // Errors without a field here (e.g. too many tries) go in the notice above the button.
      if (!known) setProblem(error.message);
      else if (Object.keys(error.fieldErrors).some((key) => !SERVER_FIELDS.includes(key as FieldName))) {
        setProblem(error.message);
      }
      focusFirstError(fromServer);
    }
  }

  const student = role === 'STUDENT';

  return (
    <GuestOnly>
      <PublicPage footerLinks={[{ label: 'About this app', href: '/about' }]}>
        <Card className="gap-5">
          <FormHeading title="Create an account" lead="New accounts are approved by an admin before you can sign in." />

          <View className="gap-2">
            <Text variant="label">I am a</Text>
            <RoleChoice value={role} onChange={chooseRole} />
          </View>

          {role ? (
            <View className="gap-4">
              <FixedField label="Department" value="Department of CSE" note="The portal is for the Department of CSE only." />
              <TextField
                ref={ref('first_name')}
                label="First name"
                value={values.first_name}
                onChangeText={set('first_name')}
                error={errors.first_name}
                autoComplete="given-name"
                textContentType="givenName"
                autoCapitalize="words"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={focus('last_name')}
                disabled={submitting}
              />
              <TextField
                ref={ref('last_name')}
                label="Last name"
                hint="Leave it empty if you have only one name."
                value={values.last_name}
                onChangeText={set('last_name')}
                error={errors.last_name}
                autoComplete="family-name"
                textContentType="familyName"
                autoCapitalize="words"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={focus('email')}
                disabled={submitting}
              />
              <TextField
                ref={ref('email')}
                label="Email"
                value={values.email}
                onChangeText={set('email')}
                error={errors.email}
                placeholder="name@example.com"
                keyboardType="email-address"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={focus(student ? 'student_id' : 'employee_id')}
                disabled={submitting}
              />

              {student ? (
                <>
                  <TextField
                    ref={ref('student_id')}
                    label="Student ID"
                    hint="Your university roll number, like 2302001."
                    value={values.student_id}
                    onChangeText={(text) => set('student_id')(text.replace(/\s/g, ''))}
                    error={errors.student_id}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    maxLength={10}
                    autoComplete="off"
                    returnKeyType="next"
                    disabled={submitting}
                  />
                  <View className="flex-row gap-3">
                    <Select
                      className="flex-1"
                      label="Level"
                      value={values.current_level || null}
                      options={lists.levels.map((level) => ({ label: levelLabel(level), value: level }))}
                      onChange={set('current_level')}
                      error={errors.current_level}
                      disabled={submitting}
                    />
                    <Select
                      className="flex-1"
                      label="Term"
                      value={values.current_semester || null}
                      options={lists.terms.map((term) => ({ label: `Term ${term}`, value: term }))}
                      onChange={set('current_semester')}
                      error={errors.current_semester}
                      disabled={submitting}
                    />
                  </View>
                </>
              ) : (
                <TextField
                  ref={ref('employee_id')}
                  label="Employee ID"
                  hint="As given by the university."
                  value={values.employee_id}
                  onChangeText={set('employee_id')}
                  error={errors.employee_id}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoComplete="off"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={focus('password')}
                  disabled={submitting}
                />
              )}

              <PasswordField
                ref={ref('password')}
                label="Password"
                autoComplete="new-password"
                hint={PASSWORD_RULES}
                value={values.password}
                onChangeText={set('password')}
                error={errors.password}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={focus('confirm')}
                disabled={submitting}
              />
              <PasswordField
                ref={ref('confirm')}
                label="Confirm password"
                autoComplete="new-password"
                value={values.confirm}
                onChangeText={set('confirm')}
                error={errors.confirm}
                returnKeyType="go"
                onSubmitEditing={submit}
                disabled={submitting}
              />

              {problem ? <Notice live tone="error" message={problem} /> : null}

              <Button
                label={submitting ? 'Creating account…' : 'Create account'}
                variant="primary"
                fullWidth
                loading={submitting}
                onPress={submit}
                className="mt-1"
              />
            </View>
          ) : (
            <Text tone="muted">Choose one to see the form.</Text>
          )}

          <View className="flex-row flex-wrap items-center justify-center gap-x-1.5 border-t border-border pt-4">
            <Text tone="muted">Already have an account?</Text>
            <Link href={authHref('/login', redirect)} asChild>
              <TextLink label="Sign in" />
            </Link>
          </View>
        </Card>
      </PublicPage>
    </GuestOnly>
  );
}
