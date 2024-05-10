## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/yourprojectname.git
   
cd yourprojectname
npm install
npm start

### 4. **Usage**
After installing the project, you will need to make sure you have the env. file to connect.  Please reach out to your project manager.  BlueClerk gives their development team the .env in a txt format,
and the developers must create it locally.  Additionaly, we may need to add your IP or VPN to our system.

### 5. **Features**
PERN STACK-
postgreSQL w/Prisma and Express
React.js
Chatgpt4-We used openai through Microsoft Azure
Github Copilot-install this into your vs terminal.  A great way to learn about the system is /explain and copilot can explain these features


### 6. **Contributing**
Encourage other developers to contribute to your repository by providing guidelines on how they can do so. For example:

```markdown
## Contributing

Git Flow
  BlueClerk's GitFlow is very specific.  When a new feature or fix is pushed, users are to push the code with the Jira ticket number/card and a description.
The flow is to push to test branch, then to staging, then to master (production).  To merge, you create a new branch and merge that into test.  If there are conflicts,
make a new branch called test-merge, and merge the test branch into that, and then back into test.  This keeps the origial feature branch clean, and in sync with master
branch.

More about BlueClerk
BlueClerk is a customer relationship and customer service platform for the new housing industry.  The MVP is Create ticket>create job>perform job/complate>create invoice>send>receive payment/record.


