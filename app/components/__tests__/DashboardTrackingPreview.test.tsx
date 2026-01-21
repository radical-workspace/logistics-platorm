import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import DashboardTrackingPreview from '@/app/components/DashboardTrackingPreview';

vi.mock('@/app/components/TrackingMap', () => ({
  default: ({
    origin,
    destination,
    lastEvent,
  }: {
    origin: { label: string };
    destination: { label: string };
    lastEvent: { label: string };
  }) => (
    <div data-testid="tracking-map">
      <span>{origin.label}</span>
      <span>{destination.label}</span>
      <span>{lastEvent.label}</span>
    </div>
  ),
}));

vi.mock('@/app/components/SimulatedMapPreview', () => ({
  default: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div data-testid="simulated-map">
      <div>{title}</div>
      <div>{subtitle}</div>
    </div>
  ),
}));

const mockFetch = vi.fn();

beforeAll(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  mockFetch.mockReset();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('DashboardTrackingPreview', () => {
  it('shows simulated map instructions before input', () => {
    render(<DashboardTrackingPreview />);

    expect(screen.getByText('Enter a reference number to preview tracking.')).toBeInTheDocument();
    expect(screen.getByTestId('simulated-map')).toHaveTextContent('Simulated map view (mobile-first)');
  });

  it('renders tracking data when lookup succeeds', async () => {
    mockFetch.mockImplementation(async () => ({
      ok: true,
      json: async () => ({
        data: {
          shipment_id: '1',
          reference_number: 'REF123',
          status: 'delivered',
          origin_address: 'Origin',
          origin_lat: 1,
          origin_lng: 2,
          destination_address: 'Destination',
          dest_lat: 3,
          dest_lng: 4,
          last_event_type: 'delivered',
          last_event_at: '2025-01-01T00:00:00Z',
          last_event_lat: 5,
          last_event_lng: 6,
        },
        error: null,
      }),
    }));

    render(<DashboardTrackingPreview />);

    const input = screen.getByPlaceholderText('Reference #');
    await userEvent.type(input, 'REF123');

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('Status: delivered')).toBeInTheDocument());
    expect(screen.getByTestId('tracking-map')).toBeInTheDocument();
  });

  it('shows error message when lookup fails', async () => {
    mockFetch.mockImplementation(async () => ({
      ok: false,
      json: async () => ({ data: null, error: 'not allowed' }),
    }));

    render(<DashboardTrackingPreview />);

    const input = screen.getByPlaceholderText('Reference #');
    await userEvent.type(input, 'REFFAIL');

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('not allowed')).toBeInTheDocument());
    expect(screen.getByTestId('simulated-map')).toHaveTextContent('Waiting for tracking data…');
  });

  it('shows not found message when lookup returns no data', async () => {
    mockFetch.mockImplementation(async () => ({
      ok: true,
      json: async () => ({ data: null, error: null }),
    }));

    render(<DashboardTrackingPreview />);

    const input = screen.getByPlaceholderText('Reference #');
    await userEvent.type(input, 'UNKNOWN');

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('No shipment found for UNKNOWN.')).toBeInTheDocument());
    expect(screen.getByTestId('simulated-map')).toHaveTextContent('Waiting for tracking data…');
  });
});
