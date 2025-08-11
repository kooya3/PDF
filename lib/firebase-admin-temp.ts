// Temporary Firebase admin mock for testing
// Replace this with real Firebase admin when ready

interface MockFirestore {
  collection: (path: string) => MockCollection;
}

interface MockCollection {
  doc: (id: string) => MockDoc;
  add: (data: any) => Promise<any>;
  get: () => Promise<{ docs: any[] }>;
  orderBy: (field: string, direction?: 'asc' | 'desc') => MockQuery;
  where: (field: string, operator: string, value: any) => MockQuery;
  limit: (limit: number) => MockQuery;
}

interface MockQuery {
  orderBy: (field: string, direction?: 'asc' | 'desc') => MockQuery;
  where: (field: string, operator: string, value: any) => MockQuery;
  limit: (limit: number) => MockQuery;
  get: () => Promise<{ docs: any[] }>;
}

interface MockDoc {
  collection: (path: string) => MockCollection;
  set: (data: any) => Promise<void>;
  get: () => Promise<{ exists: boolean; data: () => any }>;
  update: (data: any) => Promise<void>;
  delete: () => Promise<void>;
}

// Helper function to create a mock query with chainable methods
const createMockQuery = (path: string, queryParams: any = {}): MockQuery => ({
  orderBy: (field: string, direction: 'asc' | 'desc' = 'asc') => {
    console.log(`Mock Firestore QUERY orderBy: ${path} - ${field} ${direction}`);
    return createMockQuery(path, { ...queryParams, orderBy: { field, direction } });
  },
  where: (field: string, operator: string, value: any) => {
    console.log(`Mock Firestore QUERY where: ${path} - ${field} ${operator} ${value}`);
    return createMockQuery(path, { ...queryParams, where: { field, operator, value } });
  },
  limit: (limit: number) => {
    console.log(`Mock Firestore QUERY limit: ${path} - ${limit}`);
    return createMockQuery(path, { ...queryParams, limit });
  },
  get: async () => {
    console.log(`Mock Firestore QUERY get: ${path}`, queryParams);
    return { docs: [] };
  },
});

const mockFirestore: MockFirestore = {
  collection: (path: string) => ({
    doc: (id: string) => ({
      collection: (subPath: string) => mockFirestore.collection(`${path}/${id}/${subPath}`),
      set: async (data: any) => {
        console.log(`Mock Firestore SET: ${path}/${id}`, data);
      },
      get: async () => ({
        exists: false,
        data: () => ({}),
      }),
      update: async (data: any) => {
        console.log(`Mock Firestore UPDATE: ${path}/${id}`, data);
      },
      delete: async () => {
        console.log(`Mock Firestore DELETE: ${path}/${id}`);
      },
    }),
    add: async (data: any) => {
      console.log(`Mock Firestore ADD: ${path}`, data);
      return { id: 'mock-id' };
    },
    get: async () => ({
      docs: [],
    }),
    orderBy: (field: string, direction: 'asc' | 'desc' = 'asc') => {
      return createMockQuery(path).orderBy(field, direction);
    },
    where: (field: string, operator: string, value: any) => {
      return createMockQuery(path).where(field, operator, value);
    },
    limit: (limit: number) => {
      return createMockQuery(path).limit(limit);
    },
  }),
};

const mockStorage = {
  bucket: () => ({
    file: (path: string) => ({
      save: async (buffer: Buffer, options: any) => {
        console.log(`Mock Storage SAVE: ${path}`, { size: buffer.length, options });
      },
      getSignedUrl: async (config: any) => {
        console.log(`Mock Storage SIGNED_URL: ${path}`, config);
        return [`http://mock-storage-url/${path}`];
      },
      delete: async () => {
        console.log(`Mock Storage DELETE: ${path}`);
      },
    }),
  }),
};

export const adminDb = mockFirestore;
export const adminStorage = mockStorage;