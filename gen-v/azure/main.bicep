// Azure Bicep Template for FactoryOS On-Demand Rendering Infrastructure
targetScope = 'subscription'

param location string = 'eastus2'
param resourceGroupName string = 'factoryos-render-prod'
param vmSku string = 'Standard_B4ls_v2'
param adminUsername string = 'factoryosadmin'

// Resource Group
resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: resourceGroupName
  location: location
  tags: {
    Environment: 'production'
    Application: 'FactoryOS'
    Subsystem: 'Rendering'
    Owner: 'FactoryOS'
    CostCenter: 'FactoryOS-Rendering'
    ManagedBy: 'FactoryOS'
    Lifecycle: 'OnDemand'
  }
}

// Module for Resource Group Level Deployments
module renderResources 'modules/render-resources.bicep' = {
  name: 'renderResourcesDeployment'
  scope: rg
  params: {
    location: location
    vmSku: vmSku
    adminUsername: adminUsername
  }
}

output resourceGroupId string = rg.id
output vmSku string = vmSku
