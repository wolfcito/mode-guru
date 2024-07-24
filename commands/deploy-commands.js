const { REST, Routes, ApplicationCommandOptionType } = require('discord.js')
const { clientId, guildId, token } = require('../config.json')

const commands = [
  {
    name: 'update_with_form',
    description: 'Show form to Update your MODE wallet address.',
  },
  {
    name: 'update',
    description: 'Update your MODE wallet address',
    options: [
      {
        name: 'wallet',
        description: 'MODE wallet address',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
  {
    name: 'check',
    description: 'Check if you are eligible for MDOE role.',
  },
  {
    name: 'addr',
    description: 'Show your MODE wallet address.',
  },
  {
    name: 'bal',
    description: 'Show your $MODE balance.',
  },
]

const rest = new REST({ version: '10' }).setToken(token)

const deployCommands = async () => {
  try {
    console.log('Starting to register application commands.')

    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    })

    console.log('Application commands registered successfully.')
  } catch (error) {
    console.error(error)
  }
}

deployCommands()
