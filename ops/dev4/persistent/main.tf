locals {
  project   = "prime"
  name      = "simple-report"
  env       = "dev4"
  env_level = "dev"

  network_cidr = "10.1.0.0/16"
  rg_name      = data.azurerm_resource_group.dev4.name
  rg_location  = data.azurerm_resource_group.dev4.location
  management_tags = {
    prime-app      = "simple-report"
    environment    = local.env
    # Resource groups can support multiple environments at the same level. Any resources that are shared between
    # environments should use the "local.env_level" convention where possible.
    resource_group = "${local.project}-${local.name}-${local.env_level}"
  }
}

module "monitoring" {
  source        = "../../services/monitoring"
  env           = local.env
  management_rg = data.azurerm_resource_group.global.name
  rg_location   = local.rg_location
  rg_name       = local.rg_name

  app_url = "${local.env}.simplereport.gov"

  tags = local.management_tags
}

module "bastion" {
  source = "../../services/bastion_host"
  env    = local.env

  resource_group_location = local.rg_location
  resource_group_name     = local.rg_name

  virtual_network = module.vnet.network

  tags = local.management_tags
}

resource "random_password" "random_nophi_password" {
  length           = 30
  special          = false
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

module "db" {
  source      = "../../services/postgres_db"
  env         = local.env
  env_level   = local.env_level
  rg_location = local.rg_location
  rg_name     = local.rg_name

  global_vault_id = data.azurerm_key_vault.global.id
  db_vault_id     = data.azurerm_key_vault.db_keys.id
  // TODO: delete old_subnet_id when removing the old DB configuration
  old_subnet_id = module.vnet.subnet_vm_id
  subnet_id     = module.vnet.subnet_db_id
  // TODO: remove this when removing old DB config
  dns_zone_id      = module.vnet.private_dns_zone_id
  log_workspace_id = module.monitoring.log_analytics_workspace_id
  // TODO: remove this when removing old DB config
  nophi_user_password = random_password.random_nophi_password.result

  tags = local.management_tags
}

module "db_alerting" {
  source  = "../../services/alerts/db_metrics"
  env     = local.env
  rg_name = local.rg_name
  db_id   = module.db.flexible_server_id
  action_group_ids = [
    data.terraform_remote_state.global.outputs.pagerduty_non_prod_action_id
  ]
}

module "vnet" {
  source              = "../../services/virtual_network"
  env                 = local.env
  resource_group_name = local.rg_name
  network_address     = local.network_cidr
  management_tags     = local.management_tags
  location            = local.rg_location
}