import { Client as ESClient, ClientOptions } from '@elastic/elasticsearch';
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import connector from 'aws-elasticsearch-connector';

export const createESClient = (options: ClientOptions): ESClient => new ESClient({
  Connection: connector,
  ...options,
});

export default createESClient;
