# Blueclerk node API

## Description
BlueClerk is a customer relationship and customer service platform for the new housing industry. The MVP is `Create ticket > create job > perform job/complate > create invoice > send > receive payment/record`.

## Table of Contents
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [Testing](#testing)
- [License](#license)
- [Authors and Acknowledgments](#authors-and-acknowledgments)
- [Contact Information](#contact-information)
- [Changelog](#changelog)
- [FAQ](#faq)

## Installation
### Prerequisites
Operating system:
- Linux-based distributions: Ubuntu, Mint, etc. (recommended).
- MacOS.
- Windows (not recommended): in the past it has caused some problems when it comes to installing node-gyp packages. Using a virtual machine running a Linux-based distribution is a good option if you have enough hardware resources.

Mandatory software:
- Git.
- Node / npm **version 14**.

Recommended software:
- Github desktop client.
- Visual studio code.
- Nvm to manage multiple node versions.

### Steps
1. Make sure you were granted **permissions to the corresponding Github repository** and you can access it in the browser: [https://github.com/blueclerk/blueclerk-node-api.git](https://github.com/blueclerk/blueclerk-node-api.git)
2. **Clone the repository**. You can use Github desktop or the CLI command. In the second scenario, make sure you configured one of these authentication methods: [Github SSH](https://docs.github.com/en/authentication/connecting-to-github-with-ssh) or [Github tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).
```bash
git clone https://github.com/blueclerk/blueclerk-node-api.git 
```
3. Open the cloned folder and create and **fill “.env”** file with the provided environmental variables (please, ask for them if not provided).
4. Check node and npm versions:
```bash
node -v
# 14.*.*
npm -v
# 6.*.*
```
5. Install the project dependencies:
```bash
npm i
```
6. All good so far? Then you are ready to **run the project**:
```bash
npm run dev
```
7. It is probable you will get some errors when it comes to the backend connecting to the mongo database. Ask your superior to whitelist your **public** IP. You can check your IP [here](https://www.whatismyip.com).
8. App will start running in [http://localhost:3006](http://localhost:3006). You can access a Swagger API interface by visiting [http://localhost:3006/api-docs](http://localhost:3006/api-docs).

## Usage
Provide usage examples, screenshots, and instructions.

## Configuration
Explain configuration options.

## API Documentation
### Endpoints
- `GET /endpoint`: Description
- ...

### Examples
Provide example API calls.

## Contributing
Explain how to contribute and include a link to the code of conduct.

## Testing
Note we are not using neither unitary nor integration tests in the Mongoose-based backend. Please, use the Swagger interface or Postman to test changes in endpoint or new features.

For the Prisma backend, tests can be ran by executing:
```
npm run test
```

## License
State the license and link to the full text.

## Authors and Acknowledgments
List main contributors and acknowledge others.

## Contact Information
Provide contact details.

## Changelog
Document version history.

## FAQ
Address common questions.




