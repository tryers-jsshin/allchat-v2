# DeepL API - Getting Started

## 1. Introduction

The DeepL API provides programmatic access to DeepL’s language AI technology.
With an authentication key, you can integrate high-quality translations into your websites and applications.

* **API Key**: Required for authentication.
* **Test Requests**: Easily try out text translations with sample curl requests.
* **Client Libraries**: Ready-made libraries for Python, Node.js, PHP, Java, and more.
* **Community & Support**: Access resources like release notes, support center, and integration guides.

---

## 2. About

The DeepL API enables developers to bring high-quality translation to websites, apps, and workflows.

### Common Use Cases

* **Website translation**: Localize large-scale, dynamic content such as e-commerce or news portals.
* **Company communications**: Integrate into Confluence, SharePoint, etc., ensuring secure global communication.
* **Multilingual products**: Translate chat messages, product reviews, and comments in real time.

> Many CAT (Computer-Assisted Translation) tools already integrate DeepL. Developers can also build plugins to support translators.

### Why the DeepL API?

* **High-quality text & document translations**
  Outperforms competitors in translation quality. Supports `.docx`, `.pptx`, `.xlsx`, `.txt`, `.pdf`, and `.html`.
* **Maximum data security**
  Pro texts aren’t stored or used for training. Complies with EU data protection and ISO 27001.
* **Customization with glossaries**
  Define translations for specific terms at scale.

### Pricing Plans

* **Free Plan**: Up to 500,000 characters/month.
* **Pro Plan**: Unlimited translation, usage-based pricing, higher security, and priority execution.

### Intended Purpose

The DeepL API is intended for translating general documents.
⚠️ **Not suitable for high-risk applications** under [EU AI Act, Article 6](https://artificialintelligenceact.eu/article/6/).

---

## 3. Access and Authentication

The API is accessible via **HTTP endpoints** or official **client libraries**.

* **Content Types**

  * `application/x-www-form-urlencoded`
  * `application/json`
  * `multipart/form-data` (only for `/document` uploads)

* **Header Size Limit**: 16 KiB (16 × 1024 bytes)

> ⚠️ Endpoint differs between plans:
>
> * Free API → `https://api-free.deepl.com`
> * Pro API → `https://api.deepl.com`

### Authentication

* Obtain your key in [DeepL Account → API Keys](https://www.deepl.com/your-account/keys).
* Free API keys have a suffix `:fx`.
  Example: `279a2e9d-83b3-c416-7e2d-f721593e42a0:fx`
* Keep keys secret! Do not embed in client-side code.

**HTTP Header Format**:

```http
Authorization: DeepL-Auth-Key [yourAuthKey]
```

* Compromised key? → Deactivate & regenerate in Account settings.

### API Versions

* **Current version**: `v2`
* CAT tool integrations may still require `v1` (not documented here).
  Contact: [cat-tool.support@DeepL.com](mailto:cat-tool.support@DeepL.com)

---

## 4. Managing API Keys

Available actions in the [API Keys dashboard](https://www.deepl.com/your-account/keys):

* **Create Key**: Generate new authentication keys.
* **Copy Key**: Quick copy to clipboard.
* **Rename Key**: Add descriptive names (e.g., “staging-server”, “production-app”).
* **Deactivate Key**: Immediately revoke a compromised or unused key.

### Usage Monitoring

* Track per-key usage statistics.
* Export usage reports to **CSV**.

### Key Restrictions

* Set **limits per key** to prevent overuse.
* Example: Restrict staging keys to avoid unexpected billing.

---

## 5. Your First API Request

### Text Translation

Use the `/translate` endpoint.

**Example (cURL)**:

```bash
curl -X POST 'https://api.deepl.com/v2/translate' \
--header 'Authorization: DeepL-Auth-Key [yourAuthKey]' \
--header 'Content-Type: application/json' \
--data '{
  "text": ["Hello, world!"],
  "target_lang": "DE"
}'
```

**Example Response**:

```json
{
  "translations": [
    {
      "detected_source_language": "EN",
      "text": "Hallo, Welt!"
    }
  ]
}
```

> Supports **XML/HTML translation** too.

---

### Text Improvement (Write API)

Endpoint: `/write/rephrase` (Pro API only, v2)

**Example (cURL)**:

```bash
curl -X POST 'https://api.deepl.com/v2/write/rephrase' \
--header 'Authorization: DeepL-Auth-Key [yourAuthKey]' \
--header 'Content-Type: application/json' \
--data '{
  "text": ["I could relly use sum help with edits on thiss text !"],
  "target_lang": "en-US"
}'
```

**Example Response**:

```json
{
  "improvements": [
    {
      "text": "I could really use some help with editing this text!",
      "target_language": "en-US",
      "detected_source_language": "en"
    }
  ]
}
```

---

## 6. Languages Supported

The DeepL API supports the following languages.

> ⚠️ Some languages (Hebrew, Latin American Spanish, Thai, Vietnamese) are available **only for text translation via next-gen models**. They are not yet listed in `/languages`.

### Translation Source Languages

| Code | Language                     |
| ---- | ---------------------------- |
| AR   | Arabic                       |
| BG   | Bulgarian                    |
| CS   | Czech                        |
| DA   | Danish                       |
| DE   | German                       |
| EL   | Greek                        |
| EN   | English (all variants)       |
| ES   | Spanish (all variants)       |
| ET   | Estonian                     |
| FI   | Finnish                      |
| FR   | French                       |
| HE   | Hebrew *(next-gen only)*     |
| HU   | Hungarian                    |
| ID   | Indonesian                   |
| IT   | Italian                      |
| JA   | Japanese                     |
| KO   | Korean                       |
| LT   | Lithuanian                   |
| LV   | Latvian                      |
| NB   | Norwegian Bokmål             |
| NL   | Dutch                        |
| PL   | Polish                       |
| PT   | Portuguese (all variants)    |
| RO   | Romanian                     |
| RU   | Russian                      |
| SK   | Slovak                       |
| SL   | Slovenian                    |
| SV   | Swedish                      |
| TH   | Thai *(next-gen only)*       |
| TR   | Turkish                      |
| UK   | Ukrainian                    |
| VI   | Vietnamese *(next-gen only)* |
| ZH   | Chinese (all variants)       |

---

### Translation Target Languages

| Code    | Language                                 |
| ------- | ---------------------------------------- |
| AR      | Arabic                                   |
| BG      | Bulgarian                                |
| CS      | Czech                                    |
| DA      | Danish                                   |
| DE      | German                                   |
| EL      | Greek                                    |
| EN      | English (unspecified, for compatibility) |
| EN-GB   | English (British)                        |
| EN-US   | English (American)                       |
| ES      | Spanish                                  |
| ES-419  | Spanish (Latin American, next-gen only)  |
| ET      | Estonian                                 |
| FI      | Finnish                                  |
| FR      | French                                   |
| HE      | Hebrew *(next-gen only)*                 |
| HU      | Hungarian                                |
| ID      | Indonesian                               |
| IT      | Italian                                  |
| JA      | Japanese                                 |
| KO      | Korean                                   |
| LT      | Lithuanian                               |
| LV      | Latvian                                  |
| NB      | Norwegian Bokmål                         |
| NL      | Dutch                                    |
| PL      | Polish                                   |
| PT      | Portuguese (unspecified)                 |
| PT-BR   | Portuguese (Brazilian)                   |
| PT-PT   | Portuguese (European)                    |
| RO      | Romanian                                 |
| RU      | Russian                                  |
| SK      | Slovak                                   |
| SL      | Slovenian                                |
| SV      | Swedish                                  |
| TH      | Thai *(next-gen only)*                   |
| TR      | Turkish                                  |
| UK      | Ukrainian                                |
| VI      | Vietnamese *(next-gen only)*             |
| ZH      | Chinese (unspecified)                    |
| ZH-HANS | Chinese (Simplified)                     |
| ZH-HANT | Chinese (Traditional)                    |

---

### Text Improvement Languages (Write API)

Supported by `/write/rephrase`:

* DE (German)
* EN-GB (British English)
* EN-US (American English)
* ES (Spanish)
* FR (French)
* IT (Italian)
* PT-BR (Brazilian Portuguese)
* PT-PT (Portuguese)

> ⚠️ For `/write`, `writing_style` and `tone` are currently available only for **DE**, **EN-GB**, **EN-US**.

---

# ✅ Summary

* DeepL API enables **translation & text improvement** via REST endpoints.
* Supports **Free (500k chars/month)** and **Pro (unlimited, secure, prioritized)** plans.
* Authentication with **DeepL-Auth-Key** via HTTP header.
* Endpoints: `/translate`, `/write/rephrase`, `/document`, etc.
* Supports dozens of languages, with next-gen-only languages noted separately.

---

📌 이 문서는 종수가 제공해준 **Getting Started 전체 자료** (Introduction → About → Authentication → Key Management → First API Request → Supported Languages)를 하나도 빠짐없이 정리한 `.md` 버전입니다.

---