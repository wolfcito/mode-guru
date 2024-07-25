require('dotenv').config()
const {
  Client,
  Events,
  GatewayIntentBits,
  EmbedBuilder,
} = require('discord.js')
const { ethers } = require('ethers')
const db = require('./database')
const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js')
const {
  TYPE_MESSAGE,
  MODE_FUNDS_ENDPOINT,
  TYPE_INTERACTION,
  MODE_HOLDER_ROLE_NAME,
  MIN_BALANCE,
  MODE_THUMBNAIL,
} = require('./const/config.const')

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
})

// Initialize Ethereum provider and contract
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL)
const contractAddress = process.env.MODE_CONTRACT_ADDRESS
const abi = ['function balanceOf(address owner) view returns (uint256)']
const contract = new ethers.Contract(contractAddress, abi, provider)

// Helper function to get wallet address from the database
function getWalletAddressMember(message, type = TYPE_MESSAGE) {
  const userId = type === TYPE_MESSAGE ? message.author.id : message.user.id
  return db
    .prepare('SELECT walletAddress FROM wallets WHERE userId = ?')
    .get(userId)?.walletAddress
}

// Helper function to get MODE balance
async function getModeBalance(walletAddress) {
  return contract.balanceOf(walletAddress)
}

// Fetch and extract words from URL
async function fetchAndExtractWords(url, signerWallet, hashTxn) {
  try {
    const response = await fetch(url)
    const text = await response.text()

    const regex =
      /\b(As the owner of my wallet, I request to update my wallet on Mode Network|0x\w*)\b/g
    const matches = text.match(regex) || []

    const signW = matches.find((word) => word === signerWallet)
    const hashTx = matches.find((word) => word === hashTxn)

    if (signW && hashTx) {
      console.log('puede registrar')
    }
  } catch (error) {
    console.error('Error fetching the URL:', error)
  }
}

// Get staked balance from external endpoint
async function getStakedBalance(walletAddress) {
  try {
    const response = await fetch(`${MODE_FUNDS_ENDPOINT}/${walletAddress}`)
    return response.json()
  } catch (error) {
    console.error('Error fetching the URL:', error)
  }
}

// Log in message
client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.username}`)
})

// Handle interaction commands
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  const member = interaction.guild.members.cache.get(interaction.user.id)
  const avatar = member.user.avatarURL({ dynamic: true, size: 2048 })
  const username = member.user.username
  const walletAddress = getWalletAddressMember(interaction, TYPE_INTERACTION)

  if (interaction.commandName === 'addr') {
    const walletEmbed = customCard({
      titleMedia: `${username}'s wallet`,
      avatar,
      subtitle: 'Your wallet:',
      description: walletAddress,
    })

    await interaction.reply({ embeds: [walletEmbed], ephemeral: true })
  }

  if (interaction.commandName === 'bal') {
    if (!walletAddress) {
      const noWalletEmbed = customCard({
        isError: true,
        titleMedia: `${username}'s wallet`,
        avatar,
        subtitle: 'No Wallet Address Found',
        description:
          'No wallet address found. Please use /update <WALLET_ADDRESS> to register your wallet address.',
      })

      await interaction.reply({ embeds: [noWalletEmbed], ephemeral: true })
      return
    }

    try {
      const balance = await getModeBalance(walletAddress)
      const formattedBalance = ethers.formatUnits(balance, 18)

      const walletEmbed = customCard({
        titleMedia: `${username}'s wallet`,
        avatar,
        subtitle: 'Your balance:',
        description: `${formattedBalance} MODE`,
      })

      await interaction.reply({ embeds: [walletEmbed], ephemeral: true })
    } catch (error) {
      console.error(error)
      await interaction.reply({
        content:
          'There was an error retrieving your balance. Please try again later.',
        ephemeral: true,
      })
    }
  }

  if (interaction.commandName === 'check') {
    const staked = await getStakedBalance(walletAddress)
    const modeBalance = staked?.ModeToken ?? 0.0

    const role = interaction.guild.roles.cache.find(
      (memberRole) => memberRole.name === MODE_HOLDER_ROLE_NAME
    )

    if (role) {
      if (modeBalance <= MIN_BALANCE) {
        await interaction.member.roles.remove(role)
        await interaction.reply({
          content: `You need at least ${MIN_BALANCE} $MODE.`,
          ephemeral: true,
        })
        return
      }

      await interaction.member.roles.add(role)
      const walletEmbed = customCard({
        titleMedia: `${username}'s staker`,
        avatar,
        subtitle: `Achievement unlocked.`,
        description: `Role: ${MODE_HOLDER_ROLE_NAME} granted. With ${modeBalance} MODE`,
      })

      await interaction.reply({ embeds: [walletEmbed], ephemeral: true })
    }
  }

  if (interaction.commandName === 'update') {
    const walletAddress = interaction.options.getString('wallet')

    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return interaction.reply(
        'Please provide a valid Ethereum wallet address.'
      )
    }

    db.prepare('UPDATE wallets SET walletAddress = ? WHERE userId = ?').run(
      walletAddress,
      interaction.user.id
    )

    interaction.reply(
      `Your wallet address ${walletAddress} has been updated and verified.`
    )
  }

  if (interaction.commandName === 'update_with_form') {
    const modal = new ModalBuilder()
      .setCustomId('registerForm')
      .setTitle('Mode register')

    const walletAddressInput = new TextInputBuilder()
      .setCustomId('walletAddressInput')
      .setLabel('Enter your Mode Wallet Address')
      .setStyle(TextInputStyle.Short)

    const signatureHashInput = new TextInputBuilder()
      .setCustomId('signatureHashInput')
      .setLabel('Enter your Signature Hash')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('E.g.: 0x12345678....')
      .setMaxLength(132)

    modal.addComponents(
      new ActionRowBuilder().addComponents(walletAddressInput),
      new ActionRowBuilder().addComponents(signatureHashInput)
    )

    await interaction.showModal(modal)
  }

  if (interaction.isModalSubmit() && interaction.customId === 'registerForm') {
    await interaction.reply({
      content: 'Your submission was received successfully!',
      ephemeral: true,
    })

    const walletAddress =
      interaction.fields.getTextInputValue('walletAddressInput')
    const signatureHash =
      interaction.fields.getTextInputValue('signatureHashInput')

    fetchAndExtractWords(
      'https://etherscan.io/verifySig/254144',
      walletAddress,
      signatureHash
    )
  }
})

// Custom card creation
const customCard = ({
  isError = false,
  titleMedia,
  avatar,
  thumbnail = MODE_THUMBNAIL,
  subtitle = 'Subtitle',
  description = 'Description',
}) => {
  const color = isError ? 0xff0000 : 0xdffe00
  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: titleMedia, iconURL: avatar })
    .setThumbnail(thumbnail)
    .addFields({ name: subtitle, value: description })
}

// Login the Discord client
client.login(process.env.DISCORD_TOKEN)
