const { InstanceBase, Regex, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const UpgradeScripts = require('./src/upgrades')
const UpdateActions = require('./src/actions')
const UpdateFeedbacks = require('./src/feedbacks')
const UpdateVariableDefinitions = require('./src/variables')
const apiconn = require('./src/api.js')
const net = require('net')

class ModuleInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
		this.maxSources = 12 // Default value
        this.maxDestinations = 6 // Default value
	}

	async initConnection() {
		if (this.socket) {
			this.socket.destroy()
			this.socket = null
		}
	
		this.log('debug', `Attempting to connect to ${this.config.host}:${this.config.port}`)
	
		this.socket = new net.Socket()
	
		this.socket.connect(this.config.port, this.config.host, () => {
			this.log('info', 'Connected to the router')
			this.updateStatus(InstanceStatus.Ok)
		})
	
		this.socket.on('error', (err) => {
			this.log('error', `Connection error: ${err.message}`)
			this.updateStatus(InstanceStatus.Error, err.message)
		})
	
		this.socket.on('close', () => {
			this.log('info', 'Connection closed')
			this.updateStatus(InstanceStatus.ConnectionFailure)
		})
	}

	async init(config) {
		this.config = config
	
		// Set maxSources and maxDestinations from config
		this.maxSources = this.config?.max_sources || 100
		this.maxDestinations = this.config?.max_destinations || 100
	
		this.updateStatus(InstanceStatus.Ok)
	
		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
	
		// Trigger the connection
		await this.initConnection()
	}
	// When module gets deleted
	async destroy() {
		this.log('debug', 'Destroying module')
  		if (this.socket) {
  		  this.socket.removeAllListeners()
  		  this.socket.destroy()
  		  this.socket = null
  		}
	}

	async configUpdated(config) {
		const reconnectNeeded =
	    	config.host !== this.config.host ||
	    	config.port !== this.config.port
		
	  this.config = config
		
	  if (reconnectNeeded) {
	    await this.initConnection()
	  }
	}

	// Return config fields for web config
	getConfigFields() {
			let self = this
	
			return [
				{
					type: 'static-text',
					id: 'info',
					width: 12,
					label: 'Information',
					value: 'This modules controls Evertz EQX series routers using the Quartz protocol.',
				},
				{
					type: 'static-text',
					id: 'hr1',
					width: 12,
					label: ' ',
					value: '<hr />',
				},
				{
					type: 'textinput',
					id: 'host',
					label: 'IP Address',
					width: 4,
					default: '',
					regex: Regex.IP,
				},
				{
				  type: 'number',
				  id: 'port',
				  label: 'Port',
				  width: 3,
				  default: 23,
				  min: 1,
				  max: 65535,
				  required: true
				},
				{
					type: 'static-text',
					id: 'hostinfo',
					width: 5,
					label: ' ',
					value: 'The port number is typically 23.',
				},
				{
					type: 'number',
					id: 'max_destinations',
					label: 'Max Destinations',
					width: 4,
					default: 100,
					required: true,
				},
				{
					type: 'number',
					id: 'max_sources',
					label: 'Max Sources',
					width: 4,
					default: 100,
					required: true,
				},
				{
					type: 'static-text',
					id: 'hr2',
					width: 12,
					label: ' ',
					value: '<hr />',
				},
			]
		}
	

	updateActions() {
		UpdateActions(this)
	}

	updateFeedbacks() {
		UpdateFeedbacks(this)
	}

	updateVariableDefinitions() {
		UpdateVariableDefinitions(this)
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)
