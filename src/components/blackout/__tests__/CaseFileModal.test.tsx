import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CaseFileModal } from '../CaseFileModal';

describe('CaseFileModal', () => {
  it('renders nothing when closed', () => {
    const { queryByRole } = render(
      <CaseFileModal isOpen={false} onClose={() => {}} fileId="12345">
        body
      </CaseFileModal>,
    );
    expect(queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the folio header and body when open', () => {
    const { getByRole } = render(
      <CaseFileModal isOpen onClose={() => {}} fileId="12345" title="Overfold">
        <p>Deviation detail</p>
      </CaseFileModal>,
    );
    const dialog = getByRole('dialog');
    expect(within(dialog).getByText('FILE · 12345')).toBeInTheDocument();
    expect(within(dialog).getByText('Overfold')).toBeInTheDocument();
    expect(within(dialog).getByText('Deviation detail')).toBeInTheDocument();
  });

  it('exposes the severity ribbon via data attributes', () => {
    const { getByRole } = render(
      <CaseFileModal isOpen onClose={() => {}} fileId="9" severity="critical">
        x
      </CaseFileModal>,
    );
    expect(getByRole('dialog')).toHaveAttribute('data-sev', 'critical');
    expect(getByRole('dialog')).toHaveAttribute('data-ribbon', 'CRITICAL');
  });

  it('closes on the close button and Escape', () => {
    const onClose = vi.fn();
    const { getByRole } = render(
      <CaseFileModal isOpen onClose={onClose} fileId="9">
        x
      </CaseFileModal>,
    );
    fireEvent.click(within(getByRole('dialog')).getByLabelText('Close file'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
