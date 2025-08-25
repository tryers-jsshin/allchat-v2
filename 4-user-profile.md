# Instagram User Profile API

## Overview

The User Profile API allows your app to get an Instagram user's profile information using the user's Instagram-scoped ID received from an Instagram messaging webhook notification. Your app can use this information to create a personalized messaging experience for Instagram users who are interacting with your app users.

## User Consent

**⚠️ User consent is required to access an Instagram user's profile.**

### When User Consent is Set
- Instagram user sends a message to your app user
- Instagram user clicks an icebreaker or persistent menu

### When User Consent is Not Set
- Instagram user comments on a post or comment but has not sent a message to your app user
- In this case, your app will receive an error: **"User consent is required to access user profile"**

## Requirements

### Access Level
- **Advanced Access**: if your app serves Instagram professional accounts you don't own or manage
- **Standard Access**: if your app serves Instagram professional accounts you own or manage and have added to your app in the App Dashboard

### Access Tokens
- An Instagram user access token requested from your app user who received the webhook notification and who can manage messages on the Instagram professional account

### Base URL
All endpoints can be accessed via the `graph.instagram.com` host.

### Endpoints
- `/<IGSID>`

### IDs
- The Instagram-scoped ID (`<IGSID>`) for the Instagram user interested in your app user; received from a webhook notification

### Permissions
- `instagram_business_basic`
- `instagram_business_manage_messages`

### Webhook Event Subscriptions
- `messages`
- `messaging_optins`
- `messaging_postbacks`
- `messaging_referral`

### Limitations
- If the Instagram user has blocked your app user, your app will not be able to view the Instagram user's information

## Webhook Notification

To get profile information for an Instagram user who has messaged your app user's Instagram professional account, you need the Instagram-scoped ID from the `messages.sender.id` property in the webhook notification.

### Webhook Payload Example

```json
{
  "object": "instagram",
  "entry": [
    {
      "id": "<YOUR_APP_USERS_IG_ID>",  // Your app user's Instagram Professional account ID
      "time": <UNIX_TIMESTAMP>,
      "messaging": [
        {
          "sender": { "id": "<INSTAGRAM_SCOPED_ID>" },    // Instagram-scoped ID for the Instagram user who sent the message
          // ...
        }
      ]
    }
  ]
}
```

## Get Profile Information

To get the Instagram user's profile information, send a `GET` request to the `/<INSTAGRAM_SCOPED_ID>` endpoint with the `fields` parameter set to a comma-separated list of information you would like to view.

### Sample Request

```bash
curl -X GET "https://graph.instagram.com/v23.0/<INSTAGRAM_SCOPED_ID>?fields=name,username,profile_pic,follower_count,is_user_follow_business,is_business_follow_user&access_token=<INSTAGRAM_ACCESS_TOKEN>"
```

### Sample Response

```json
{
  "name": "Peter Chang",
  "username": "peter_chang_live",
  "profile_pic": "https://fbcdn-profile-...",
  "follower_count": 1234,
  "is_user_follow_business": false,
  "is_business_follow_user": true
}
```

## Field Reference

| Field Name | Type | Description |
|------------|------|-------------|
| `access_token` | string | The Instagram user access token from your app user who can manage messages on the Instagram professional account who received the webhook notification |
| `follower_count` | int | The number of followers the Instagram user has |
| `<IGSID>` | int | The Instagram-scoped ID returned in a webhook notification that represents the Instagram user who interacted with your app user's Instagram professional account and triggered the notification |
| `is_business_follow_user` | boolean | Indicates whether your app user follows the Instagram user (`true`) or not (`false`) |
| `is_user_follow_business` | boolean | Indicates whether the Instagram user follows your app user (`true`) or not (`false`) |
| `is_verified_user` | boolean | Indicates whether the Instagram user has a verified Instagram account (`true`) or not (`false`) |
| `name` | string | The Instagram user's name (can be null if name not set) |
| `profile_pic` | url | The URL for the Instagram user's profile picture (can be null if profile pic not set). The URL will expire in a few days |
| `username` | string | The Instagram user's username |

## Practical Use Cases

### 1. Personalized Customer Service

```bash
# Get customer profile for personalized response
curl -X GET "https://graph.instagram.com/v23.0/<IGSID>?fields=name,username,is_verified_user,follower_count,is_user_follow_business&access_token=<TOKEN>"
```

**Use Cases:**
- Identify VIP customers (verified users or high follower count)
- Customize responses based on follow relationship
- Generate personalized greetings

### 2. CRM Integration

```bash
# Collect comprehensive profile data
curl -X GET "https://graph.instagram.com/v23.0/<IGSID>?fields=name,username,profile_pic,follower_count,is_verified_user,is_user_follow_business,is_business_follow_user&access_token=<TOKEN>"
```

**Use Cases:**
- Store profile information in customer database
- Track follow relationships
- Customer segmentation

### 3. Influencer Identification

```bash
# Check for influencer status
curl -X GET "https://graph.instagram.com/v23.0/<IGSID>?fields=is_verified_user,follower_count,username&access_token=<TOKEN>"
```

**Use Cases:**
- Identify users with high follower counts
- Verify account status
- Target collaboration opportunities

## Implementation Example

### Processing Webhook and Getting Profile

```javascript
// 1. Receive webhook notification
app.post('/webhook', (req, res) => {
  const { messaging } = req.body.entry[0];
  const senderId = messaging[0].sender.id;
  
  // 2. Get user profile
  getUserProfile(senderId);
  
  res.status(200).send('OK');
});

// 3. Fetch user profile function
async function getUserProfile(igsid) {
  const fields = 'name,username,follower_count,is_user_follow_business,is_verified_user';
  const url = `https://graph.instagram.com/v23.0/${igsid}?fields=${fields}&access_token=${ACCESS_TOKEN}`;
  
  try {
    const response = await fetch(url);
    const profile = await response.json();
    
    // 4. Use profile data for personalization
    if (profile.is_verified_user) {
      console.log('VIP customer detected');
    }
    
    if (profile.follower_count > 10000) {
      console.log('Potential influencer');
    }
    
    return profile;
  } catch (error) {
    console.error('Error fetching profile:', error);
  }
}
```

## Error Handling

### Common Error Scenarios

1. **User Consent Required**
   - Error: "User consent is required to access user profile"
   - Solution: Ensure user has sent a message first

2. **Blocked User**
   - Scenario: Customer has blocked the business
   - Result: Unable to retrieve profile information

3. **Expired Profile Picture URL**
   - Scenario: Profile picture URL expires after a few days
   - Solution: Regularly refresh profile data

## Best Practices

### Efficient Data Management

```bash
# Request only needed fields to optimize response time
curl -X GET "https://graph.instagram.com/v23.0/<IGSID>?fields=name,is_user_follow_business&access_token=<TOKEN>"
```

### Batch Processing

```bash
# Get profile information for multiple users at once
curl -X GET "https://graph.instagram.com/v23.0/?ids=<IGSID1>,<IGSID2>,<IGSID3>&fields=name,username,follower_count&access_token=<TOKEN>"
```

### Data Refresh Strategy

```javascript
// Refresh profile data periodically
const refreshProfile = async (igsid) => {
  const profile = await getUserProfile(igsid);
  
  // Update database with fresh profile data
  await updateCustomerProfile(igsid, profile);
};

// Schedule periodic refresh
setInterval(() => {
  refreshActiveCustomerProfiles();
}, 24 * 60 * 60 * 1000); // Daily refresh
```

## Next Steps

Use this profile information to:
- [Send Quick Replies](https://developers.facebook.com/docs/instagram/messaging-api/quick-replies)
- Create personalized messaging experiences
- Build comprehensive customer relationship management systems
- Implement targeted marketing campaigns

## Key Takeaways

- **User consent is mandatory**: Users must message your business first
- **Profile picture URLs expire**: Refresh data regularly
- **Blocked users**: Cannot access profile information for blocked users
- **Follow relationships**: Leverage follow status for personalized experiences
- **Verification status**: Identify VIP customers and potential influencers