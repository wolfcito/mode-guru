> ⚠️ Warning: 
> The code within this repository is provided without any warranties. It is important to note that the code has not been audited for potential security vulnerabilities. Using this code could potentially lead to loss of funds, compromised data, or asset risk. Exercise caution and use this code at your own risk. Please refer to the LICENSE file for details about the terms and conditions.


# Discord Bot for Mode Network

![simple aimagen](https://github.com/user-attachments/assets/f2958cf8-49ba-470f-89c4-8ef066c08962)
This project is a Discord bot that integrates Ethereum network functionalities, allowing users to interact with MODE tokens directly from Discord. The bot offers features such as wallet address registration, balance inquiries, role assignment based on token holdings, and more.

## Features

- **Wallet Address Registration and Update**: Users can register their Ethereum wallet address to associate it with their Discord account.
- **MODE Token Balance Inquiry**: Allows users to check their MODE token balance directly on Discord.
- **Automatic Role Assignment**: If a user has at least the minimum required MODE token balance, they are assigned a specific role on the Discord server.
- **Interactive User Interface**: Utilizes modals and slash commands to facilitate user interaction.
- **Signature Verification**: Implements signature verification to ensure wallet address ownership.

## Prerequisites

- **Node.js** v14 or higher
- **NPM** (installed with Node.js)
- **A Discord Account** with permissions to manage bots
- **Discord Bot Token** obtained from the [Discord Developer Portal](https://discord.com/developers/applications)
- **Ethereum RPC Provider** (e.g., Infura or Alchemy)
- **Environment Variables** configured in a `.env` file

## Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/your_username/your_repository.git
   ```

2. **Navigate to the project directory**:

   ```bash
   cd your_repository
   ```

3. **Install dependencies**:

   ```bash
   npm install
   ```

4. **Configure environment variables**:

   Create a `.env` file in the root of the project and add the following variables:

   ```env
   DISCORD_TOKEN=your_discord_token
   RPC_URL=your_ethereum_rpc_url
   MODE_CONTRACT_ADDRESS=mode_contract_address
   ```

5. **Configure the settings file**:

   In the file `./const/config.const.js`, set the following parameters according to your needs:

   ```javascript
   const MODE_FUNDS_ENDPOINT = 'https://mode.network/api/funds'; // Endpoint to obtain fund balances
   const MODE_HOLDER_ROLE_NAME = 'ModeHolder'; // Name of the role to assign
   const MIN_BALANCE = 100; // Minimum required MODE token balance
   const MODE_THUMBNAIL = 'URL_of_the_image'; // URL of the thumbnail for embedded messages
   ```

6. **Start the bot**:

   ```bash
   node index.js
   ```

## Usage

Once the bot is online and added to your Discord server, users can interact with it using the following commands:

### Available Commands

- **/addr**

  Displays the registered Ethereum wallet address of the user.

  **Usage**:

  ```
  /addr
  ```

- **/bal**

  Shows the user's MODE token balance.

  **Usage**:

  ```
  /bal
  ```

- **/check**

  Verifies if the user has at least the minimum MODE token balance and assigns the corresponding role if so.

  **Usage**:

  ```
  /check
  ```

- **/update**

  Updates the user's Ethereum wallet address.

  **Usage**:

  ```
  /update wallet:<WALLET_ADDRESS>
  ```

  **Example**:

  ```
  /update wallet:0x1234567890abcdef1234567890abcdef12345678
  ```

- **/update_with_form**

  Opens a modal form for the user to enter their wallet address and signature.

  **Usage**:

  ```
  /update_with_form
  ```

### Usage Examples

- **Register or Update Your Wallet Address**:

  Use the `/update` command followed by your wallet address.

- **Check Your MODE Token Balance**:

  Ensure you have registered your wallet address, then use the `/bal` command.

- **Obtain the Holder Role**:

  If you have at least the minimum MODE token balance, use the `/check` command for the bot to verify your balance and assign you the corresponding role.

## Ethereum Integration

The bot connects to the Ethereum network using `ethers.js` and performs the following actions:

- **Balance Inquiry**: Uses the `balanceOf` method from the MODE contract to get a user's token balance.
- **Signature Verification**: Implements the `fetchAndExtractWords` function to verify wallet ownership by extracting information from a URL (e.g., etherscan).

## Database

The bot uses a SQLite database to store associations between Discord user IDs and their Ethereum wallet addresses.

## Security

- **Tokens and Keys**: Ensure you do not share your Discord bot token or your private keys.
- **Input Validation**: The bot validates wallet addresses using `ethers.isAddress` to ensure only valid addresses are registered.

## Contribution

If you wish to contribute to the project, please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix (`git checkout -b feature/new-feature`).
3. Make your changes and commit them (`git commit -m 'Add new feature'`).
4. Push to the branch (`git push origin feature/new-feature`).
5. Open a Pull Request detailing the changes made.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.

## Contact

If you have questions or suggestions, you can open an issue in the repository or contact the main maintainer at [email](guffenix+github@gmail.com).
