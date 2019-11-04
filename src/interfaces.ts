import { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import { ClientOptions, RequestParams } from '@elastic/elasticsearch';

export interface DDB2ESParam {
  ddbStreamEvent: DynamoDBStreamEvent;
  esOptions: ClientOptions;
  forEachRecordToDocument: (record?: DynamoDBRecord) => RequestParams.Index<{[key: string]: any}> | RequestParams.Delete;
}
