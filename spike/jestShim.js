// Spike only: lets the unchanged Jest tests run. The real swap renames jest.* to vi.* in each file.
globalThis.jest = vi;
