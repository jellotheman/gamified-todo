import { expect, test } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import Index from '../app/index';

test('the skeleton renders Hello World', async () => {
  await render(<Index />);
  expect(screen.getByText('Hello World')).toBeTruthy();
});
