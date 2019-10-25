import { Client, ClientOptions } from '@elastic/elasticsearch';
import connector from 'aws-elasticsearch-connector';

export const es = (opts: ClientOptions): Client => new Client({
  Connection: connector,
  ...opts,
});

export default es;
