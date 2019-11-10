import { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import { ClientOptions, RequestParams } from '@elastic/elasticsearch';

export interface DDB2ESParam {
  ddbStreamEvent: DynamoDBStreamEvent;
  esOptions: ClientOptions;
  bulkOptions: RequestParams.Bulk;
  forEachRecordToDocument: (record?: DynamoDBRecord) => { index: string; id: string };
}
