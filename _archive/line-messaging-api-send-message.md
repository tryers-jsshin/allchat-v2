# Send messages

With the Messaging API, you can make your bot send messages to users. At any time, you can initiate to send a message to a user and reply to a user's message. You can also use various message types.

| Messaging types | Message types |
| --- | --- |
| Reply message<br/>Push message: One-to-one<br/>Multicast message: One-to-many (Targets a list of user IDs)<br/>Narrowcast message: One-to-many (Targets a segmented list)<br/>Broadcast message: One-to-many (Targets all friends) | Text message<br/>Text message (v2)<br/>Sticker message<br/>Image message<br/>Video message<br/>Audio message<br/>Location message<br/>Imagemap message<br/>Template message<br/>Flex message<br/>For more information about message types, see [Message types](https://developers.line.biz/en/docs/messaging-api/message-types/). |

## Messaging types

The Messaging API provides two main types of send methods that you can use.

- Reply to messages and actions from users (reply messages)
- Send messages at any time

### Reply to messages and actions from users (reply messages)

When a user adds your LINE Official Account as a friend or sends a message to your LINE Official Account, you can reply with the Messaging API. Set the `replyToken` property to the reply token you receive through a [webhook event](https://developers.line.biz/en/reference/messaging-api/#webhook-event-objects) from the user's action. In a single request, you can send up to five [message objects](https://developers.line.biz/en/reference/messaging-api/#message-objects).

**💡 You can display loading animations while preparing a reply message**

After your LINE Official Account receives a message from a user, the response may takes some time due to message preparation or reservation processing. In such cases, you can visually tell the user that you want them to wait by displaying a loading animation. For more information, see [Display a loading animation](https://developers.line.biz/en/docs/messaging-api/use-loading-indicator/).

Here is an example request to send a reply message:

```bash
curl -v -X POST https://api.line.me/v2/bot/message/reply \
-H 'Content-Type: application/json' \
-H 'Authorization: Bearer {channel access token}' \
-d '{
    "replyToken":"nHuyWiB7yP5Zw52FIkcQobQuGDXCTA",
    "messages":[
        {
            "type":"text",
            "text":"Hello, user"
        },
        {
            "type":"text",
            "text":"May I help you?"
        }
    ]
}'
```

For more information, see [Send reply message](https://developers.line.biz/en/reference/messaging-api/#send-reply-message) in the Messaging API reference.

### Send messages at any time

You can send messages to users at any time using any of the following methods:

| Messaging type | Description |
| --- | --- |
| [Push message](https://developers.line.biz/en/reference/messaging-api/#send-push-message) | Sends a message to a user, group chat, and multi-person chat. For example, you can use this to notify a user that an item they bought on your shopping site is shipped. |
| [Multicast message](https://developers.line.biz/en/reference/messaging-api/#send-multicast-message) | Sends a message to multiple users at once. The difference between this and narrowcast is that you specify target recipients with a user ID. For example, you can use this to notify all your shopping site members of a new feature. |
| [Narrowcast message](#send-narrowcast-message) | Sends a message to multiple users at once. The difference between this and multicast is that you specify target recipients with user's attribute data or retargeting (audiences). The user attribute data includes gender, age, OS type, region, and more. |
| [Broadcast message](https://developers.line.biz/en/reference/messaging-api/#send-broadcast-message) | You can send the same message to all users who are friends with your LINE Official Account. |

You can send up to five [message objects](https://developers.line.biz/en/reference/messaging-api/#message-objects) in a single request.

**ℹ️ How to count the number of messages**

The number of messages counted as sent is the number of people you send the message to. The number of [message objects](https://developers.line.biz/en/reference/messaging-api/#message-objects) you specify in a single request has no effect on the number of messages sent. Suppose you sent a push message with four message objects in a single request to a chat room containing five people. Here, the number of sent messages is five.

Messages sent to users who won't receive your message are excluded from counting. Such users are those with a user ID that has blocked your LINE Official Account or with a user ID that doesn't exist.

Here is an example request to send a push message:

```bash
curl -v -X POST https://api.line.me/v2/bot/message/push \
-H 'Content-Type: application/json' \
-H 'Authorization: Bearer {channel access token}' \
-d '{
    "to": "U4af4980629...",
    "messages":[
        {
            "type":"text",
            "text":"Hello, world1"
        },
        {
            "type":"text",
            "text":"Hello, world2"
        }
    ]
}'
```

## Send narrowcast messages

Narrowcast messaging lets you send a message to multiple users, when you want. You can't send narrowcast messages to group chats or multi-person chats. For narrowcast messages, specify recipients with attribute data such as age, gender, OS, and region or through retargeting (audiences).

To send narrowcast messages:

1. [Prepare audience or request ID](#prepare-audience-or-request-id)
2. [Begin sending narrowcast messages](#send-narrowcast-message-detail)
3. [Check the status of a narrowcast message](#get-narrowcast-progress-status)

### Prepare audience or request ID

To send a narrowcast message, you must prepare an audience or request ID, depending on the target recipient. You can combine target recipients using logical operators (AND, OR, and NOT). For example, you can include users who received message A and users who clicked a URL in message B as the target recipient, with an OR operation.

| Target recipient | Data to prepare |
| --- | --- |
| All users who added your LINE Official Account as a friend | None required |
| Users identifiable by a user ID or Identifier for Advertisers (IFA) | [Audience for uploading user IDs (by JSON)](https://developers.line.biz/en/reference/messaging-api/#create-upload-audience-group)<br/>[Audience for uploading user IDs (by file)](https://developers.line.biz/en/reference/messaging-api/#create-upload-audience-group-by-file) |
| Users who clicked a URL in a message you sent | [Message click audience](https://developers.line.biz/en/reference/messaging-api/#create-click-audience-group) |
| Users who opened a message you sent | [Message impression audience](https://developers.line.biz/en/reference/messaging-api/#create-imp-audience-group) |
| Users who received a narrowcast message | Specify the request ID of the narrowcast message previously delivered in the redelivery object of the [recipient object](https://developers.line.biz/en/reference/messaging-api/#narrowcast-recipient). |
| Users with specific tags in a chat | Chat tag audience. Use the [LINE Official Account Manager](https://manager.line.biz/) to create one. |
| Users who added your LINE Official Account as a friend through a specific path | Friend path audience. Use the [LINE Official Account Manager](https://manager.line.biz/). |
| Users who reserved a visit before | Reservation audience. Use the [LINE Official Account Manager](https://manager.line.biz/) to create one. |
| Users who viewed a rich menu | Rich menu impression audience. Use the [LINE Official Account Manager](https://manager.line.biz/) to create one. |
| Users who clicked on a rich menu | Rich menu click audience. Use the [LINE Official Account Manager](https://manager.line.biz/) to create one. |
| Users narrowed down with LINE Tag tracking information | Web traffic audience. Use the [LINE Official Account Manager](https://manager.line.biz/) or the [LINE Ad Manager](https://admanager.line.biz/) to create one. |
| Users who viewed a video you sent | Video view audience. Use the [LINE Ad Manager](https://admanager.line.biz/) to create one. |
| Users who participated in given events within the app (e.g. opening the app, making a purchase within the app) | App event audience. Use the [LINE Ad Manager](https://admanager.line.biz/) to create one. |
| Users who clicked an image you sent | Image click audience. Use the [LINE Ad Manager](https://admanager.line.biz/) to create one. |
| Users who saw a beacon banner | LINE Beacon Network ad impression audience. Use the [LINE Ad Manager](https://admanager.line.biz/) to create one. LINE Beacon Network ad impression audience is only available for LINE Official Accounts created by users in Taiwan. |

**📝 Note**

You can't create the following types of audiences with the Messaging API:

- Chat tag audience
- Friend path audience  
- Reservation audience
- Rich menu impression audience
- Rich menu click audience
- Web traffic audience
- App event audience
- Video view audience
- Image click audience
- LINE Beacon Network ad impression audience

Once you've created an audience, follow the instructions below to confirm that it's ready to accept messages.

#### Confirm that the audience can be used for delivery

Audiences are created asynchronously in the background. Before you send a narrowcast message to an audience, make sure that the audience's status is `READY` (ready to accept messages).

You can check the status of an audience using the following endpoint:

```bash
curl -v -X GET https://api.line.me/v2/bot/audienceGroup/{audienceGroupId} \
-H 'Authorization: Bearer {channel access token}'
```

If the `status` property in the response is `READY` (ready to accept messages), then you can send narrowcast messages to the audience.

For more information about how to check the status of an audience, see [Get audience data](https://developers.line.biz/en/reference/messaging-api/#get-audience-group) in the Messaging API Reference.

### Begin sending narrowcast messages

When you send a narrowcast message, you can combine these objects to narrow the target recipient.

- [Recipient object](#recipient-object)
  - [Audience object](#audience-object)
  - [Redelivery object](#redelivery-object)
- [Demographic filter object](#demographic-filter-object)
- [Operator object](#operator-object)

For example, you can specify target recipients to be women from two audiences who are not aged between 15-20 years old. You can combine objects with logical operators (AND, OR, and NOT).

You have a monthly limit on the number of messages you can send. If you try to send more than the limit, delivery will fail. To keep the number of outgoing messages less than the limit, set the `limit.upToRemainingQuota` property to `true`. For more information about the maximum number of messages you can send, see [Messaging API pricing](https://developers.line.biz/en/docs/messaging-api/pricing/).

**⚠️ Other messages may fail to send until narrowcast message delivery is complete**

When you send a narrowcast message, regardless of the actual number of messages being sent, you may reach the approximate limit for the messages you can reserve for the month. Once you reach the approximate limit, you would have to wait until the narrowcast message delivery is complete, as you can't exceed the limit. If you attempt to send another message in that state, `You have reached your monthly limit.` will be returned, and the message will fail to send.

For more information, see [Note regarding the number of remaining messages to be sent during the current month](https://developers.line.biz/en/reference/messaging-api/#send-narrowcast-message-cautions) in the Messaging API reference.

#### Recipient object

When you send a narrowcast message, specify the request body with the message content in the `messages` property and the message target in the `recipient` property. If you don't specify the `recipient` property, the message recipient becomes all users who added your LINE Official Account as a friend.

For the `recipient` property, you can specify [audience objects](#audience-object) or [redelivery objects](#redelivery-object).

##### Audience object

To send a narrowcast message to an audience, set the `recipient` property in the request body to an audience object. To create an audience object, specify the `type` property with `"audience"` and the `audienceGroupId` property with your audience ID in an object. If you don't have an audience, create one using the [managing audience](https://developers.line.biz/en/reference/messaging-api/#manage-audience-group) APIs.

Here is an example of an audience object:

```json
{
  "type": "audience",
  "audienceGroupId": 5614991017776
}
```

##### Redelivery object

To send a narrowcast message to users who received a narrowcast message before, set the `recipient` property in the request body to a redelivery object. Redelivery objects have the `type` property set to `"redelivery"`. Set the `requestId` property to the request ID (`X-Line-Request-Id`) that was obtained when you sent the narrowcast messages.

Here is an example of a redelivery object:

```json
{
  "type": "redelivery",
  "requestId": "5b59509c-c57b-11e9-aa8c-2a2ae2dbcce4"
}
```

**⚠️ "There weren't enough recipients" error**

If you tried to send a message by specifying the request ID of a previously sent message with a redelivery object, but `errorCode` of `2` (This means that an error occurred because there weren't enough recipients.) is returned, these may be the causes:

- The number of the previous target recipients is decreased because some of them have blocked your LINE Official Account after receiving the referenced narrowcast message.
- The number of the target recipients is decreased because you have narrowed them down by combining them with other audience objects or demographic filter objects using [operators](#operator-object) (AND or NOT).

To prevent someone from guessing the recipients' attributes, you can't send narrowcast messages if the number of recipients is less than the required minimum. For more information, see [Restrictions on sending messages using attributes and audiences](https://developers.line.biz/en/reference/messaging-api/#send-narrowcast-message-restrictions).

For more information on the audience object and redelivery object, see [Recipient object](https://developers.line.biz/en/reference/messaging-api/#narrowcast-recipient) in the Messaging API reference.

#### Demographic filter object

By specifying the demographic filter object (`filter.demographic` property), you can distribute a message segmentally based on the attributes (gender, age, type of OS, region, etc.) of users.

Here is an example of a demographic filter object to filter by gender:

```json
{
  "type": "gender",
  "oneOf": ["male", "female"]
}
```

For more information, see [Demographic filter object](https://developers.line.biz/en/reference/messaging-api/#narrowcast-demographic-filter) in the Messaging API reference.

#### Operator object

Using the product set (AND), the union set (OR), and the difference set (NOT) of operator objects, multiple conditions from recipient objects and demographic filter objects can be combined to specify target recipients.

Here is an example recipient object specified with an operator object:

```json
"recipient": {
    "type": "operator",
    "and": [
        {
            "type": "audience",
            "audienceGroupId": 5614991017776
        },
        {
            "type": "operator",
            "not": {
                "type": "redelivery",
                "requestId": "5b59509c-c57b-11e9-aa8c-2a2ae2dbcce4"
            }
        }
    ]
}
```

**💡 You can use operator objects to specify target recipients in a nested structure**

You can nest recipient objects and demographic filter objects using operator objects to specify recipients. Operator objects are applied first, starting with the deepest level of nesting.

The target recipient in this diagram is interpreted as "**users who fit A, B, and E, but not C and D** (`AudienceA AND AudienceB AND NOT (AudienceC AND Audience D) AND Audience E`)".

```json
{
    "type": "operator",
    "and": [
        {
            "type": "audience",
            "audienceGroupId": "AudienceA"
        },
        {
            "type": "audience", 
            "audienceGroupId": "AudienceB"
        },
        {
            "type": "operator",
            "not": {
                "type": "operator",
                "and": [
                    {
                       "type": "audience",
                       "audienceGroupId": "AudienceC"
                    },
                    {
                       "type": "audience",
                       "audienceGroupId": "AudienceD"
                    }
                 ]
            }
        },
        {
            "type": "audience",
            "audienceGroupId": "AudienceE"
        }
    ]
}
```

### Example request to send a narrowcast message

Suppose we want to request to send a narrowcast message to who:

- Belongs to an audience (Audience ID: `5614991017776`)
- Didn't receive a narrowcast message (Request ID: `5b59509c-c57b-11e9-aa8c-2a2ae2dbcce4`)
- Are either male or female aged between 20-25
- Lives in Akita or Aichi prefecture
- Has been a friend with this example's LINE Official Account, for 7 to 30 days
- Are women and aged between 35 and 40 (Exclude men)

Here is an example request to send a narrowcast message to the target recipients specified above:

```bash
curl -v -X POST https://api.line.me/v2/bot/message/narrowcast \
-H 'Authorization: Bearer {channel access token}' \
-H 'Content-Type: application/json' \
-d '{
    "messages": [
        {
            "type": "text",
            "text": "test message"
        }
    ],
    "recipient": {
        "type": "operator",
        "and": [
            {
                "type": "audience",
                "audienceGroupId": 5614991017776
            },
            {
                "type": "operator",
                "not": {
                    "type": "redelivery",
                    "requestId": "5b59509c-c57b-11e9-aa8c-2a2ae2dbcce4"
                }
            }
        ]
    },
    "filter": {
        "demographic": {
            "type": "operator",
            "or": [
                {
                    "type": "operator",
                    "and": [
                        {
                            "type": "gender",
                            "oneOf": [
                                "male",
                                "female"
                            ]
                        },
                        {
                            "type": "age",
                            "gte": "age_20",
                            "lt": "age_25"
                        },
                        {
                            "type": "appType",
                            "oneOf": [
                                "android",
                                "ios"
                            ]
                        },
                        {
                            "type": "area",
                            "oneOf": [
                                "jp_23",
                                "jp_05"
                            ]
                        },
                        {
                            "type": "subscriptionPeriod",
                            "gte": "day_7",
                            "lt": "day_30"
                        }
                    ]
                },
                {
                    "type": "operator",
                    "and": [
                        {
                            "type": "age",
                            "gte": "age_35",
                            "lt": "age_40"
                        },
                        {
                            "type": "operator",
                            "not": {
                                "type": "gender",
                                "oneOf": [
                                    "male"
                                ]
                            }
                        }
                    ]
                }
            ]
        }
    },
    "limit": {
        "max": 100,
        "upToRemainingQuota": true
    }
}'
```

For more information, see [Sending narrowcast messages](https://developers.line.biz/en/reference/messaging-api/#send-narrowcast-message) in the Messaging API Reference.

### Check the status of a narrowcast message

Narrowcast messages are sent asynchronously in the background. To find out whether the narrowcast message was sent successfully, execute the [Get narrowcast message status](https://developers.line.biz/en/reference/messaging-api/#get-narrowcast-progress-status) endpoint as shown in the example below.

```bash
curl -v -X GET 'https://api.line.me/v2/bot/message/progress/narrowcast?requestId={request_id}' \
-H 'Authorization: Bearer {channel access token}'
```

## Send quote messages

You can send messages that quote past messages using the Messaging API.

To send a message quoting a past message, specify the quote token (`quoteToken`) of the message to be quoted. For more information about how to retrieve quote tokens, see [Get quote tokens](https://developers.line.biz/en/docs/messaging-api/get-quote-tokens/).

**Example of a push message request quoting a past message**

```bash
curl -v -X POST https://api.line.me/v2/bot/message/push \
-H 'Content-Type: application/json' \
-H 'Authorization: Bearer {channel access token}' \
-d '{
  "to": "U4af4980629...",
  "messages": [
    {
      "type": "text",
      "text": "Yes, you can.",
      "quoteToken": "yHAz4Ua2wx7..." // Specify the quote token of the message to be quoted
    }
  ]
}'
```

Note that if the sending of the message to be quoted has been cancelled, or if the past chat history has been deleted from the device, the quoted message won't be displayed.

You can only use quote tokens to send messages with the following endpoints:

- [Send reply message](https://developers.line.biz/en/reference/messaging-api/#send-reply-message)
- [Send push message](https://developers.line.biz/en/reference/messaging-api/#send-push-message)

Also, when sending a message using a quote token, you can only use the following message objects:

- [Text message](https://developers.line.biz/en/docs/messaging-api/message-types/#text-messages)
- [Text message (v2)](https://developers.line.biz/en/docs/messaging-api/message-types/#text-messages-v2)
- [Sticker message](https://developers.line.biz/en/docs/messaging-api/message-types/#sticker-messages)