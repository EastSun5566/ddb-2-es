import { Client as ESClient, ClientOptions } from '@elastic/elasticsearch';
import { Config as AWSConfig } from 'aws-sdk';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import createAwsElasticsearchConnector from 'aws-elasticsearch-connector';

export const createESClient = (options: ClientOptions): ESClient => new ESClient({
  ...createAwsElasticsearchConnector(AWSConfig),
  ...options,
});

export default createESClient;
