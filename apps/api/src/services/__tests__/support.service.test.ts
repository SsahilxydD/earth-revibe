import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supportService } from '../support.service';

vi.mock('@earth-revibe/db', () => ({
  prisma: {
    supportTicket: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    ticketMessage: {
      create: vi.fn(),
    },
  },
  Prisma: {},
}));

import { prisma } from '@earth-revibe/db';

const mockTicket = {
  id: 'ticket-1',
  ticketNumber: 'TKT-ABC123',
  userId: 'user-1',
  subject: 'My order is damaged',
  category: 'ORDER',
  status: 'OPEN',
  priority: 'MEDIUM',
  assignedTo: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockMessage = {
  id: 'msg-1',
  ticketId: 'ticket-1',
  userId: 'admin-1',
  content: 'We are looking into this.',
  attachment: null,
  createdAt: new Date(),
  user: { id: 'admin-1', firstName: 'Admin', lastName: 'User', role: 'ADMIN' },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('supportService.listAllTickets', () => {
  it('returns all tickets with default pagination', async () => {
    vi.mocked(prisma.supportTicket.findMany).mockResolvedValue([mockTicket] as any);
    vi.mocked(prisma.supportTicket.count).mockResolvedValue(1);

    const result = await supportService.listAllTickets({ page: 1, limit: 20 });

    expect(result.tickets).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.totalPages).toBe(1);
  });

  it('filters by status when provided', async () => {
    vi.mocked(prisma.supportTicket.findMany).mockResolvedValue([]);
    vi.mocked(prisma.supportTicket.count).mockResolvedValue(0);

    await supportService.listAllTickets({ page: 1, limit: 20, status: 'OPEN' as any });

    expect(prisma.supportTicket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'OPEN' }) })
    );
  });

  it('filters by priority when provided', async () => {
    vi.mocked(prisma.supportTicket.findMany).mockResolvedValue([]);
    vi.mocked(prisma.supportTicket.count).mockResolvedValue(0);

    await supportService.listAllTickets({ page: 1, limit: 20, priority: 'HIGH' as any });

    expect(prisma.supportTicket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ priority: 'HIGH' }) })
    );
  });

  it('applies OR search across ticketNumber and subject', async () => {
    vi.mocked(prisma.supportTicket.findMany).mockResolvedValue([]);
    vi.mocked(prisma.supportTicket.count).mockResolvedValue(0);

    await supportService.listAllTickets({ page: 1, limit: 20, search: 'damaged' });

    const call = vi.mocked(prisma.supportTicket.findMany).mock.calls[0][0] as any;
    expect(call.where.OR).toEqual([
      { ticketNumber: { contains: 'damaged', mode: 'insensitive' } },
      { subject: { contains: 'damaged', mode: 'insensitive' } },
    ]);
  });

  it('respects custom page and limit', async () => {
    vi.mocked(prisma.supportTicket.findMany).mockResolvedValue([]);
    vi.mocked(prisma.supportTicket.count).mockResolvedValue(0);

    await supportService.listAllTickets({ page: 3, limit: 5 });

    expect(prisma.supportTicket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 5 })
    );
  });

  it('calculates totalPages correctly', async () => {
    vi.mocked(prisma.supportTicket.findMany).mockResolvedValue([]);
    vi.mocked(prisma.supportTicket.count).mockResolvedValue(55);

    const result = await supportService.listAllTickets({ page: 1, limit: 20 });

    expect(result.totalPages).toBe(3);
  });
});

describe('supportService.getTicket', () => {
  it('returns ticket when found by ticketNumber', async () => {
    vi.mocked(prisma.supportTicket.findUnique).mockResolvedValue(mockTicket as any);

    const result = await supportService.getTicket('TKT-ABC123');

    expect(result).toEqual(mockTicket);
    expect(prisma.supportTicket.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ticketNumber: 'TKT-ABC123' } })
    );
  });

  it('throws ApiError.notFound when ticket does not exist', async () => {
    vi.mocked(prisma.supportTicket.findUnique).mockResolvedValue(null);

    await expect(supportService.getTicket('TKT-MISSING')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });
});

describe('supportService.updateStatus', () => {
  it('updates ticket status when found', async () => {
    vi.mocked(prisma.supportTicket.findUnique).mockResolvedValue(mockTicket as any);
    vi.mocked(prisma.supportTicket.update).mockResolvedValue({
      ...mockTicket,
      status: 'RESOLVED',
    } as any);

    const result = await supportService.updateStatus('TKT-ABC123', 'RESOLVED');

    expect(prisma.supportTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockTicket.id },
        data: { status: 'RESOLVED' },
      })
    );
    expect(result.status).toBe('RESOLVED');
  });

  it('throws ApiError.notFound when ticket does not exist', async () => {
    vi.mocked(prisma.supportTicket.findUnique).mockResolvedValue(null);

    await expect(supportService.updateStatus('TKT-MISSING', 'RESOLVED')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
    expect(prisma.supportTicket.update).not.toHaveBeenCalled();
  });

  it('can update status to CLOSED', async () => {
    vi.mocked(prisma.supportTicket.findUnique).mockResolvedValue(mockTicket as any);
    vi.mocked(prisma.supportTicket.update).mockResolvedValue({
      ...mockTicket,
      status: 'CLOSED',
    } as any);

    await supportService.updateStatus('TKT-ABC123', 'CLOSED');

    const updateCall = vi.mocked(prisma.supportTicket.update).mock.calls[0][0] as any;
    expect(updateCall.data.status).toBe('CLOSED');
  });
});

describe('supportService.assignTicket', () => {
  it('assigns ticket to agent and auto-transitions OPEN to IN_PROGRESS', async () => {
    vi.mocked(prisma.supportTicket.findUnique).mockResolvedValue({
      ...mockTicket,
      status: 'OPEN',
    } as any);
    vi.mocked(prisma.supportTicket.update).mockResolvedValue({
      ...mockTicket,
      status: 'IN_PROGRESS',
      assignedTo: 'agent-1',
    } as any);

    const result = await supportService.assignTicket('TKT-ABC123', 'agent-1');

    expect(prisma.supportTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ assignedTo: 'agent-1', status: 'IN_PROGRESS' }),
      })
    );
    expect(result.status).toBe('IN_PROGRESS');
  });

  it('does not change status when ticket is already IN_PROGRESS', async () => {
    vi.mocked(prisma.supportTicket.findUnique).mockResolvedValue({
      ...mockTicket,
      status: 'IN_PROGRESS',
    } as any);
    vi.mocked(prisma.supportTicket.update).mockResolvedValue({
      ...mockTicket,
      status: 'IN_PROGRESS',
      assignedTo: 'agent-2',
    } as any);

    await supportService.assignTicket('TKT-ABC123', 'agent-2');

    const updateCall = vi.mocked(prisma.supportTicket.update).mock.calls[0][0] as any;
    // status should be undefined (not forced to IN_PROGRESS) when not OPEN
    expect(updateCall.data.status).toBeUndefined();
  });

  it('does not change status when ticket is RESOLVED', async () => {
    vi.mocked(prisma.supportTicket.findUnique).mockResolvedValue({
      ...mockTicket,
      status: 'RESOLVED',
    } as any);
    vi.mocked(prisma.supportTicket.update).mockResolvedValue({ ...mockTicket } as any);

    await supportService.assignTicket('TKT-ABC123', 'agent-1');

    const updateCall = vi.mocked(prisma.supportTicket.update).mock.calls[0][0] as any;
    expect(updateCall.data.status).toBeUndefined();
  });

  it('throws ApiError.notFound when ticket does not exist', async () => {
    vi.mocked(prisma.supportTicket.findUnique).mockResolvedValue(null);

    await expect(supportService.assignTicket('TKT-MISSING', 'agent-1')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
    expect(prisma.supportTicket.update).not.toHaveBeenCalled();
  });
});

describe('supportService.adminReply', () => {
  it('creates a message for an existing ticket', async () => {
    vi.mocked(prisma.supportTicket.findUnique).mockResolvedValue({
      ...mockTicket,
      status: 'IN_PROGRESS',
    } as any);
    vi.mocked(prisma.ticketMessage.create).mockResolvedValue(mockMessage as any);

    const result = await supportService.adminReply('admin-1', 'TKT-ABC123', {
      content: 'We are looking into this.',
    });

    expect(prisma.ticketMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ticketId: mockTicket.id,
          userId: 'admin-1',
          content: 'We are looking into this.',
        }),
      })
    );
    expect(result).toEqual(mockMessage);
  });

  it('auto-transitions OPEN ticket to IN_PROGRESS on admin reply', async () => {
    vi.mocked(prisma.supportTicket.findUnique).mockResolvedValue({
      ...mockTicket,
      status: 'OPEN',
    } as any);
    vi.mocked(prisma.ticketMessage.create).mockResolvedValue(mockMessage as any);
    vi.mocked(prisma.supportTicket.update).mockResolvedValue({
      ...mockTicket,
      status: 'IN_PROGRESS',
    } as any);

    await supportService.adminReply('admin-1', 'TKT-ABC123', {
      content: 'We have received your request.',
    });

    expect(prisma.supportTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockTicket.id },
        data: { status: 'IN_PROGRESS' },
      })
    );
  });

  it('does not update status when ticket is already IN_PROGRESS', async () => {
    vi.mocked(prisma.supportTicket.findUnique).mockResolvedValue({
      ...mockTicket,
      status: 'IN_PROGRESS',
    } as any);
    vi.mocked(prisma.ticketMessage.create).mockResolvedValue(mockMessage as any);

    await supportService.adminReply('admin-1', 'TKT-ABC123', {
      content: 'Further update here.',
    });

    // statusUpdate only fires on OPEN, so update should not be called
    expect(prisma.supportTicket.update).not.toHaveBeenCalled();
  });

  it('throws ApiError.notFound when ticket does not exist', async () => {
    vi.mocked(prisma.supportTicket.findUnique).mockResolvedValue(null);

    await expect(
      supportService.adminReply('admin-1', 'TKT-MISSING', { content: 'Hello' })
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
    expect(prisma.ticketMessage.create).not.toHaveBeenCalled();
  });

  it('stores optional attachment on the message', async () => {
    vi.mocked(prisma.supportTicket.findUnique).mockResolvedValue({
      ...mockTicket,
      status: 'IN_PROGRESS',
    } as any);
    vi.mocked(prisma.ticketMessage.create).mockResolvedValue({
      ...mockMessage,
      attachment: 'https://cdn.example.com/file.pdf',
    } as any);

    await supportService.adminReply('admin-1', 'TKT-ABC123', {
      content: 'See attached',
      attachment: 'https://cdn.example.com/file.pdf',
    });

    const createCall = vi.mocked(prisma.ticketMessage.create).mock.calls[0][0] as any;
    expect(createCall.data.attachment).toBe('https://cdn.example.com/file.pdf');
  });
});
