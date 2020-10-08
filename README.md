# DynamoDB To Elasticsearch

[![NPM Version](https://img.shields.io/npm/v/ddb-2-es.svg?style=for-the-badge)](https://www.npmjs.com/package/ddb-2-es)
[![NPM Downloads](https://img.shields.io/npm/dt/ddb-2-es.svg?style=for-the-badge)](https://www.npmjs.com/package/ddb-2-es)
[![License](https://img.shields.io/github/license/EastSun5566/ddb-2-es.svg?style=for-the-badge)](https://www.npmjs.com/package/ddb-2-es)

> 🚚 Load streaming data into Amazon ES from DynamoDB by Lambda with latest ES bulk API

## ✨ Installation

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

export const ddb2es: DynamoDBStreamHandler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  try {
    await ddb2es({
      // DDB stream event is required
      ddbStreamEvent: event,

      // ES endpoint is required
      esOptions: { node: `https://${ES_DOMAIN}` },

      // ES index is optional, default is DDB table name
      // (ES id is also optional, default is DDB table Keys join)
      forEachRecordToDocument: () => ({ index: ES_INDEX }),
    });
  } catch (err) {
    console.error("Error:", JSON.stringify(error, null, 2));

    throw error;
  }
};

export default ddb2es;
```

### Customization

```ts
ddb2es({
  // Sometimes you want ES Doc index / id base on each stream record (DDB table item)
  forEachRecordToDocument: (record) => ({
    index: record.hashKey,
    id: record.rangeKey,
  }),
});
```
