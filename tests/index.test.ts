/* eslint-disable import/no-unresolved */
import { before, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { DynamoDBStreamEvent } from 'aws-lambda';

const mockBulk = mock.fn(async () => ({ errors: false }));

let ddb2es: (options: {
  ddbStreamEvent: DynamoDBStreamEvent;
  esOptions: Record<string, unknown>;
  bulkOptions?: Record<string, unknown>;
  forEachRecordToDocument?: (record: any) => { index?: string; id?: string };
}) => Promise<void>;

let mockCreateESClientOpts: Record<string, unknown> | null = null;

// Mock ../src/es.ts before ../src/index.ts is loaded so createESClient is replaced
mock.module('../src/es.ts', {
  namedExports: {
    createESClient: (opts: Record<string, unknown>) => {
      mockCreateESClientOpts = opts;
      return { bulk: mockBulk };
    },
  },
});

before(async () => {
  ({ ddb2es } = await import('../src/index.ts'));
});

test('handles INSERT event and creates index operation', async () => {
  mockBulk.mock.resetCalls();

  const event: DynamoDBStreamEvent = {
    Records: [
      {
        eventName: 'INSERT',
        eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789:table/my-table/stream/2021-01-01T00:00:00.000',
        dynamodb: {
          Keys: { pk: { S: 'abc' } },
          NewImage: { pk: { S: 'abc' }, count: { N: '1' } },
        },
      },
    ],
  };

  await ddb2es({ ddbStreamEvent: event, esOptions: {} });

  assert.strictEqual(mockBulk.mock.callCount(), 1);
  const [param] = mockBulk.mock.calls[0].arguments as [{ operations: Record<string, unknown>[] } & Record<string, unknown>];
  assert.deepStrictEqual(param.operations[0], { index: { _index: 'my-table', _id: 'abc' } });
  assert.deepStrictEqual(param.operations[1], { pk: 'abc', count: 1 });
});

test('handles REMOVE event and creates delete operation', async () => {
  mockBulk.mock.resetCalls();

  const event: DynamoDBStreamEvent = {
    Records: [
      {
        eventName: 'REMOVE',
        eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789:table/my-table/stream/2021-01-01T00:00:00.000',
        dynamodb: {
          Keys: { pk: { S: 'abc' } },
        },
      },
    ],
  };

  await ddb2es({ ddbStreamEvent: event, esOptions: {} });

  assert.strictEqual(mockBulk.mock.callCount(), 1);
  const [param] = mockBulk.mock.calls[0].arguments as [{ operations: Record<string, unknown>[] } & Record<string, unknown>];
  assert.deepStrictEqual(param.operations[0], { delete: { _index: 'my-table', _id: 'abc' } });
  assert.strictEqual(param.operations.length, 1);
});

test('throws an error when bulk response has errors', async () => {
  mockBulk.mock.mockImplementationOnce(async () => ({ errors: true }));

  const event: DynamoDBStreamEvent = {
    Records: [
      {
        eventName: 'INSERT',
        eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789:table/my-table/stream/2021-01-01T00:00:00.000',
        dynamodb: {
          Keys: { pk: { S: 'abc' } },
          NewImage: { pk: { S: 'abc' } },
        },
      },
    ],
  };

  await assert.rejects(
    () => ddb2es({ ddbStreamEvent: event, esOptions: {} }),
    Error,
  );
});

test('uses custom forEachRecordToDocument for index and id', async () => {
  mockBulk.mock.resetCalls();

  const event: DynamoDBStreamEvent = {
    Records: [
      {
        eventName: 'MODIFY',
        eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789:table/my-table/stream/2021-01-01T00:00:00.000',
        dynamodb: {
          Keys: { pk: { S: 'abc' } },
          NewImage: { pk: { S: 'abc' } },
        },
      },
    ],
  };

  await ddb2es({
    ddbStreamEvent: event,
    esOptions: {},
    forEachRecordToDocument: () => ({ index: 'custom-index', id: 'custom-id' }),
  });

  const [param] = mockBulk.mock.calls[0].arguments as [{ operations: Record<string, unknown>[] } & Record<string, unknown>];
  assert.deepStrictEqual(param.operations[0], { index: { _index: 'custom-index', _id: 'custom-id' } });
});

test('handles MODIFY event and creates index operation with NewImage payload', async () => {
  mockBulk.mock.resetCalls();

  const event: DynamoDBStreamEvent = {
    Records: [
      {
        eventName: 'MODIFY',
        eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789:table/my-table/stream/2021-01-01T00:00:00.000',
        dynamodb: {
          Keys: { pk: { S: 'xyz' } },
          NewImage: { pk: { S: 'xyz' }, message: { S: 'hello' } },
        },
      },
    ],
  };

  await ddb2es({ ddbStreamEvent: event, esOptions: {} });

  assert.strictEqual(mockBulk.mock.callCount(), 1);
  const [param] = mockBulk.mock.calls[0].arguments as [{ operations: Record<string, unknown>[] } & Record<string, unknown>];
  assert.deepStrictEqual(param.operations[0], { index: { _index: 'my-table', _id: 'xyz' } });
  assert.deepStrictEqual(param.operations[1], { pk: 'xyz', message: 'hello' });
});

test('handles missing or undefined dynamodb properties gracefully', async () => {
  mockBulk.mock.resetCalls();

  const event: DynamoDBStreamEvent = {
    Records: [
      {
        eventName: 'REMOVE',
        eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789:table/my-table/stream/2021-01-01T00:00:00.000',
        dynamodb: undefined,
      },
    ],
  };

  await ddb2es({ ddbStreamEvent: event, esOptions: {} });

  assert.strictEqual(mockBulk.mock.callCount(), 1);
  const [param] = mockBulk.mock.calls[0].arguments as [{ operations: Record<string, unknown>[] } & Record<string, unknown>];
  assert.deepStrictEqual(param.operations[0], { delete: { _index: 'my-table', _id: '' } });
});

test('applies custom bulk options to bulk parameters', async () => {
  mockBulk.mock.resetCalls();

  const event: DynamoDBStreamEvent = {
    Records: [],
  };

  await ddb2es({
    ddbStreamEvent: event,
    esOptions: {},
    bulkOptions: { refresh: 'wait_for' },
  });

  assert.strictEqual(mockBulk.mock.callCount(), 1);
  const [param] = mockBulk.mock.calls[0].arguments as [{ operations: Record<string, unknown>[], refresh?: string } & Record<string, unknown>];
  assert.strictEqual(param.refresh, 'wait_for');
});

test('passes esOptions correctly to createESClient', async () => {
  mockCreateESClientOpts = null;
  const esOptions = { node: 'https://example.com', maxRetries: 3 };

  await ddb2es({
    ddbStreamEvent: { Records: [] },
    esOptions,
  });

  assert.deepStrictEqual(mockCreateESClientOpts, esOptions);
});

test('handles composite/multiple DynamoDB Keys and joins them with standard delimiter or empty string', async () => {
  mockBulk.mock.resetCalls();

  const event: DynamoDBStreamEvent = {
    Records: [
      {
        eventName: 'INSERT',
        eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789:table/my-table/stream/2021-01-01T00:00:00.000',
        dynamodb: {
          Keys: { pk: { S: 'partition' }, sk: { S: 'sort' } },
          NewImage: { pk: { S: 'partition' }, sk: { S: 'sort' }, text: { S: 'hello' } },
        },
      },
    ],
  };

  await ddb2es({ ddbStreamEvent: event, esOptions: {} });

  assert.strictEqual(mockBulk.mock.callCount(), 1);
  const [param] = mockBulk.mock.calls[0].arguments as [{ operations: Record<string, unknown>[] } & Record<string, unknown>];
  // Standard implementation is Object.values(keys).join('')
  assert.deepStrictEqual(param.operations[0], { index: { _index: 'my-table', _id: 'partitionsort' } });
});

test('handles mixed INSERT and REMOVE events in a single batch', async () => {
  mockBulk.mock.resetCalls();

  const event: DynamoDBStreamEvent = {
    Records: [
      {
        eventName: 'INSERT',
        eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789:table/my-table/stream/2021-01-01T00:00:00.000',
        dynamodb: {
          Keys: { pk: { S: 'id-1' } },
          NewImage: { pk: { S: 'id-1' }, value: { S: 'inserted' } },
        },
      },
      {
        eventName: 'REMOVE',
        eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789:table/my-table/stream/2021-01-01T00:00:00.000',
        dynamodb: {
          Keys: { pk: { S: 'id-2' } },
        },
      },
    ],
  };

  await ddb2es({ ddbStreamEvent: event, esOptions: {} });

  assert.strictEqual(mockBulk.mock.callCount(), 1);
  const [param] = mockBulk.mock.calls[0].arguments as [{ operations: Record<string, unknown>[] } & Record<string, unknown>];

  // The first record: index op + payload
  assert.deepStrictEqual(param.operations[0], { index: { _index: 'my-table', _id: 'id-1' } });
  assert.deepStrictEqual(param.operations[1], { pk: 'id-1', value: 'inserted' });

  // The second record: delete op
  assert.deepStrictEqual(param.operations[2], { delete: { _index: 'my-table', _id: 'id-2' } });
  assert.strictEqual(param.operations.length, 3);
});

test('handles missing or malformed eventSourceARN gracefully', async () => {
  mockBulk.mock.resetCalls();

  const event: DynamoDBStreamEvent = {
    Records: [
      {
        eventName: 'INSERT',
        eventSourceARN: undefined,
        dynamodb: {
          Keys: { pk: { S: 'id-1' } },
          NewImage: { pk: { S: 'id-1' } },
        },
      },
      {
        eventName: 'REMOVE',
        eventSourceARN: 'invalid-arn-format',
        dynamodb: {
          Keys: { pk: { S: 'id-2' } },
        },
      },
    ],
  };

  await ddb2es({ ddbStreamEvent: event, esOptions: {} });

  assert.strictEqual(mockBulk.mock.callCount(), 1);
  const [param] = mockBulk.mock.calls[0].arguments as [{ operations: Record<string, unknown>[] } & Record<string, unknown>];

  // Under undefined eventSourceARN, splitting of undefined or missing throws or falls back.
  // Let's verify standard behavior:
  // record.eventSourceARN && record.eventSourceARN.split('/')[1].toLowerCase()
  // Since undefined falsy -> standard fallback in JS logic, index is undefined unless custom logic handled.
  // Wait, let's see how ddb2es handles it:
  // index = record.eventSourceARN && record.eventSourceARN.split('/')[1].toLowerCase()
  // If undefined, index is undefined. We should check if that translates to undefined in bulk operations.
  assert.strictEqual(param.operations[0].index._index, undefined);
  assert.strictEqual(param.operations[2].delete._index, undefined); // 'invalid-arn-format'.split('/')[1] is undefined
});
