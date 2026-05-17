import { describe, it, expect, vi } from 'vitest';
import { render, within, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from '../ConfirmDialog';
import '@testing-library/jest-dom';

describe('ConfirmDialog', () => {
  it('renders with title and description', () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={true}
        title="Delete Data"
        description="Are you sure?"
        confirmLabel="Confirm Delete"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(within(container).getByText('Delete Data')).toBeInTheDocument();
    expect(within(container).getByText('Are you sure?')).toBeInTheDocument();
    expect(within(container).getByText('Confirm Delete')).toBeInTheDocument();
  });

  it('calls onConfirm and onCancel when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { container } = render(
      <ConfirmDialog
        isOpen={true}
        title="Title"
        description="Msg"
        confirmLabel="Go"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
    fireEvent.click(within(container).getByText('Go'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={false}
        title="Title"
        description="Msg"
        confirmLabel="Go"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(within(container).queryByText('Title')).not.toBeInTheDocument();
  });
});
