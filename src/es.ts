import { Client as ESClient } from '@elastic/elasticsearch';
import AWS from 'aws-sdk';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import createAwsElasticsearchConnector from 'aws-elasticsearch-connector';

type ClientOptions = ConstructorParameters<typeof ESClient>[0];

export const createESClient = (options: ClientOptions): ESClient => new ESClient({
  ...((createAwsElasticsearchConnector as any)(AWS.Config)),
  ...options,
});

export default createESClient;
