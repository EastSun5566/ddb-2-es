# DynamoDB To Elasticsearch

> 🚚 A Typescript implement DynamoDB to Elasticsearch in Lambda with latest ES client Bulk API

## ✨ Install

```sh
npm i ddb-2-es

# or yarn add ddb-2-es
```

## 🚀 Usage

### Basic

```ts
import { DynamoDBStreamHandler } from "aws-lambda";
import { ddb2es } from "ddb-2-es";

const { ES_DOMAIN, ES_INDEX } = process.env;

export const ddb2es: DynamoDBStreamHandler = async event => {
  console.error("Event:", JSON.stringify(event, null, 2));

  try {
    await ddb2es({
      // DDB stream event is required
      ddbStreamEvent: event,

      // ES endpoint is required
      esOptions: { node: `https://${ES_DOMAIN}` },

      // ES index is optional, default is DDB table name
      // (ES id also optional, default is DDB table Keys join)
      forEachRecordToDocument: () => ({ index: ES_INDEX })
    });
  } catch (err) {
    console.error("Error:", JSON.stringify(error, null, 2));

    throw error;
  }
};

export default ddb2es;
```

### Custom

```ts
ddb2es({
  // Sometimes you want ES Doc index / id base on each stream record (DDB table item)
  forEachRecordToDocument: record => ({
    index: record.hashKey,
    id: record.rangeKey
  })
});
```
