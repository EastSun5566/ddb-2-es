import { Client as ESClient, ClientOptions } from '@elastic/elasticsearch';
import connector from 'aws-elasticsearch-connector';

export const createESClient = (options: ClientOptions): ESClient => new ESClient({
  Connection: connector,
  ...options,
});

export default createESClient;
