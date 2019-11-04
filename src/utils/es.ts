import { Client, ClientOptions } from '@elastic/elasticsearch';
import connector from 'aws-elasticsearch-connector';

export const createESClient = (options: ClientOptions): Client => new Client({
  Connection: connector,
  ...options,
});

export default createESClient;
