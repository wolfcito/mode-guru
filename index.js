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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
})

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL)
const contractAddress = process.env.MODE_CONTRACT_ADDRESS
const abi = ['function balanceOf(address owner) view returns (uint256)']
const contract = new ethers.Contract(contractAddress, abi, provider)

function getWalletAddressMember(message, type = TYPE_MESSAGE) {
  if (type === TYPE_MESSAGE) {
    return db
      .prepare('SELECT walletAddress FROM wallets WHERE userId = ?')
      .get(message.author.id)?.walletAddress
  }

  return db
    .prepare('SELECT walletAddress FROM wallets WHERE userId = ?')
    .get(message.user.id)?.walletAddress
}

async function getModeBalance(walletAddress) {
  const balance = await contract.balanceOf(walletAddress)
  return balance
}

async function fetchAndExtractWords(url, signerWallet, hashTxn) {
  try {
    const response = await fetch(url)
    const text = await response.text()

    const regex =
      /\b(As the owner of my wallet, I request to update my wallet on Mode Network|0x\w*)\b/g
    const matches = text.match(regex)

    const result = matches || []

    // console.log(result)
    const signW = result.find((word) => word === signerWallet)
    const hashTx = result.find((word) => word === hashTxn)

    // console.log('signW:', signW, ' hashTx:', hashTx)
    if (signW && hashTx) {
      console.log('puede registrar')
    }
  } catch (error) {
    console.error('Error fetching the URL:', error)
  }
}

async function getStakedBalance(walletAddress) {
  try {
    const response = await fetch(`${MODE_FUNDS_ENDPOINT}/${walletAddress}`)
    const result = await response.json()

    return result
  } catch (error) {
    console.error('Error fetching the URL:', error)
  }
}

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.username}`)
})

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  const member = interaction.guild.members.cache.get(interaction.user.id)
  const avatar = member.user.avatarURL({ dynamic: true, size: 2048 })
  const username = member.user.username

  if (interaction.commandName === 'addr') {
    const walletAddress = getWalletAddressMember(interaction, TYPE_INTERACTION)

    const walletEmbed = customCard({
      titleMedia: `${username}'s wallet`,
      avatar,
      subtitle: 'Your wallet:',
      description: walletAddress,
    })

    await interaction.reply({
      embeds: [walletEmbed],
      ephemeral: true,
    })
  }
  if (interaction.commandName === 'bal') {
    const walletAddress = getWalletAddressMember(interaction, TYPE_INTERACTION)

    if (!walletAddress) {
      const noWalletEmbed = customCard({
        isError: true,
        titleMedia: `${username}'s wallet`,
        avatar,
        subtitle: 'No Wallet Address Found',
        description:
          'No wallet address found. Please use /update <WALLET_ADDRESS> to register your wallet address.',
      })

      await interaction.reply({
        embeds: [noWalletEmbed],
        ephemeral: true,
      })
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

      await interaction.reply({
        embeds: [walletEmbed],
        ephemeral: true,
      })
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
    const walletAddress = getWalletAddressMember(interaction, TYPE_INTERACTION)

    const staked = await getStakedBalance(walletAddress)
    console.log('staked:', staked)
    console.log('staked.ModeToken:', staked.ModeToken)
    const modeBalance = staked?.ModeToken ?? 0.0

    const role = interaction.guild.roles.cache.find(
      (memberRole) => memberRole.name === MODE_HOLDER_ROLE_NAME
    )

    console.log('role:', role)

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

      await interaction.reply({
        embeds: [walletEmbed],
        ephemeral: true,
      })
      return
    }
  }
})

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return

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

    return interaction.reply(
      `Your wallet address ${walletAddress} has been updated and verified.`
    )
  }
})

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  if (interaction.commandName === 'update_with_form') {
    const modal = new ModalBuilder()
      .setCustomId('registerForm')
      .setTitle('Mode register')

    const walletAddressInput = new TextInputBuilder()
      .setCustomId('walletAddressInput')

      .setLabel('Enter you Mode Wallet Address')

      .setStyle(TextInputStyle.Short)

    const signatureHashInput = new TextInputBuilder()
      .setCustomId('signatureHashInput')
      .setLabel('Enter you Signature Hash')

      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Ej.: 0x12345678....')
      .setMaxLength(132)

    const firstActionRow = new ActionRowBuilder().addComponents(
      walletAddressInput
    )
    const secondActionRow = new ActionRowBuilder().addComponents(
      signatureHashInput
    )

    modal.addComponents(firstActionRow, secondActionRow)

    await interaction.showModal(modal)
  }
})

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isModalSubmit()) return
  if (interaction.customId === 'registerForm') {
    await interaction.reply({
      content: 'Your submission was received successfully!',
    })
  }

  // Get the data entered by the user
  const walletAddress =
    interaction.fields.getTextInputValue('walletAddressInput')
  const signatureHash =
    interaction.fields.getTextInputValue('signatureHashInput')
  console.log({ walletAddress, signatureHash })

  fetchAndExtractWords(
    'https://etherscan.io/verifySig/254144',
    walletAddress,
    signatureHash
  )
})

client.login(process.env.DISCORD_TOKEN)

const customCard = ({
  isError = false,
  titleMedia,
  avatar,
  thumbnail = MODE_THUMBNAIL,
  subtitle = 'Subtitle',
  description = 'Description',
}) => {
  const color = isError ? 0xff0000 : 0xdffe00
  const walletEmbed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({
      name: titleMedia,
      iconURL: avatar,
    })
    .setThumbnail(thumbnail)
    .addFields({
      name: subtitle,
      value: description,
    })

  return walletEmbed
}
