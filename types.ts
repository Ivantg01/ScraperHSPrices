/** @module types */

// Amazon Cloud types ======================================================================

/** Amazon Region type */
export type AmazonCloudRegion = {
  name: string;
  displayName: string;
  regionalDisplayName: string;
  regionalName: string;
  active: boolean;
};

/** Azure cloud product type (no API for products in Azure) */
export type AmazonCloudService = {
  name: string;
  serviceId: string;
  displayName: string;
  active: boolean;
  scrapePerRegion: boolean;
};

/** Amazon cloud SKU flattened for easy storage in database */
export type AmazonCloudSkuFlat = {
  searchCode: string; //internal own code to facilite searching
  rateCode: string; //skuId.OfferTermCode.UnitTypeCode
  serviceCode: string; //AmazonEC2,...
  regionCode: string;
  termType: string; //onDemand, reserved,
  leaseContractLength?: string; //1yr, 3yr
  purchaseOption?: string; //No Upfront, All Upfront
  offeringClass?: string; //convertible, standard
  priceDescription: string;
  startingRange?: string;
  endingRange?: string;
  unit: string; //Hrs, GB-Mo
  price: number;
  currency: string;
  productFamily: string; //storage, compute
  usageType: string;
  storageMedia?: string; //HDD, SSD
  volumeType?: string; //storage: standard, standard-infrequent-access
  volumeApiName?: string; //gp2.gp3.io2
  fromLocationType?: string; //AWS Region, AWS local zone
  operation?: string; //RunInstances linux, windows, ...
  tenancy?: string; //Shared, Dedicated
  instanceType?: string; //c1.large, m1.small
  databaseEngine?: string; //PostgreSQL, MySQL
  databaseEdition?: string; //Standard, Enterprise
  deploymentOption?: string; //Single-AZ, Multi-AZ
  licenseModel?: string; //BringYourOwnLicense, LicenseIncluded
};

/** Azure cloud SKU flattened for historical data */
export type AmazonCloudSkuStat = {
  dateCode: string; //save date with format YYYYMMDD
  rateCode: string;
  regionCode: string;
  productFamily: string;
  instanceType?: string;
  volumeApiName?: string;
  leaseContractLength?: string;
  deploymentOption?: string;
  startingRange?: string;
  priceDescription: string;
  price: number;
};

// Azure Cloud types ======================================================================

/** Azure cloud Region type */
export type AzureCloudRegion = {
  name: string;
  displayName: string;
  regionalDisplayName: string;
  regionalName: string;
  active: boolean;
};

/** Azure cloud product type (no API for products in Azure) */
export type AzureCloudProduct = {
  productName: string;
  productId: string;
  serviceName: string;
  serviceId: string;
  active: boolean;
};

/** Azure cloud SKU type as returned in Azure Cloud API */
export type AzureCloudSkuApi = {
  currencyCode: string;
  tierMinimumUnits: number;
  reservationTerm?: string;
  retailPrice: number;
  unitPrice: number;
  armRegionName: string;
  location: string;
  effectiveStartDate: string;
  meterId: string;
  meterName: string;
  productId: string;
  skuId: string;
  productName: string;
  skuName: string;
  serviceName: string;
  serviceId: string;
  serviceFamily: string;
  unitOfMeasure: string;
  type: string;
  isPrimaryMeterRegion: boolean;
  armSkuName: string;
};

/** Azure cloud SKU flattened for easy storage in database */
export type AzureCloudSkuFlat = {
  searchCode: string; //internal own code to facilite searching
  currencyCode: string;
  tierMinimumUnits: number;
  reservationTerm: string;
  price: number;
  armRegionName: string;
  location: string;
  effectiveStartDate: Date;
  meterId: string;
  meterName: string;
  productId: string;
  skuId: string;
  productName: string;
  skuName: string;
  serviceName: string;
  serviceId: string;
  serviceFamily: string;
  unitOfMeasure: string;
  type: string;
  isPrimaryMeterRegion: boolean;
  armSkuName: string;
};

/** Azure cloud SKU flattened for historical data */
export type AzureCloudSkuStat = {
  dateCode: string; //save date with format YYYYMMDD
  skuId: string;
  armRegionName: string;
  productId: string;
  productName: string;
  skuName: string;
  reservationTerm: string;
  tierMinimumUnits: number;
  price: number;
};

// Google Cloud types ======================================================================

/** Google cloud Region type */
export type GoogleCloudRegion = {
  name: string;
  displayName: string;
  regionalDisplayName: string;
  regionalName: string;
  active: boolean;
};

/** Google cloud service type as returned in Google Cloud API */
export type GoogleCloudServiceApi = {
  name: string;
  serviceId: string;
  displayName: string;
  businessEntityName?: string;
};

/** Google cloud services for storage in database */
export type GoogleCloudService = {
  name: string;
  serviceId: string;
  displayName: string;
  active: boolean;
};

/** Google cloud SKU type as returned in Google Cloud API */
export type GoogleCloudSkuApi = {
  name: string;
  skuId: string;
  description: string;
  category: {
    serviceDisplayName: string;
    resourceFamily: string;
    resourceGroup: string;
    usageType: string;
  };
  serviceRegions: string[];
  pricingInfo: Array<{
    summary: string;
    pricingExpression: {
      usageUnit: string;
      displayQuantity: number;
      tieredRates: Array<{
        startUsageAmount: number;
        unitPrice: {
          currencyCode: string;
          units: string;
          nanos: number;
        };
      }>;
      usageUnitDescription: string;
      baseUnit: string;
      baseUnitDescription: string;
      baseUnitConversionFactor: number;
    };
    currencyConversionRate: number;
    effectiveTime: string;
  }>;
  serviceProviderName: string;
  geoTaxonomy: {
    type: string;
    regions: string[];
  };
};

/** Google cloud SKU flattened for easy storage in database */
export type GoogleCloudSkuFlat = {
  searchCode: string; //internal own code to facilite searching
  serviceId: string;
  skuId: string;
  description: string;
  serviceDisplayName: string;
  resourceFamily: string;
  resourceGroup: string;
  usageType: string;
  serviceRegion: string;
  usageUnit: string;
  displayQuantity: number;
  startUsageAmount: number;
  price: number;
  currencyCode: string;
  usageUnitDescription: string;
  baseUnit: string;
  baseUnitDescription: string;
  baseUnitConversionFactor: number;
  geoTaxonomyType: string;
};

/** Google cloud SKU reduced for historical data */
export type GoogleCloudSkuStat = {
  dateCode: string; //save date with format YYYYMMDD
  skuId: string;
  description: string;
  serviceRegion: string;
  serviceDisplayName: string;
  resourceFamily: string;
  resourceGroup?: string;
  usageType?: string;
  geoTaxonomy?: string;
  virtualMachineType?: string;
  price: number;
};

// Oracle Cloud types ======================================================================
export type OracleCloudSkuApi = {
  partNumber: string;
  displayName: string;
  metricName: string;
  serviceCategory: string;
  currencyCodeLocalizations: Array<{
    currencyCode: string;
    prices: Array<{
      model: string;
      value: number;
      rangeMin?: number;
      rangeMax?: number;
    }>;
  }>;
};

export type OracleCloudSkuFlat = {
  partNumber: string;
  displayName: string;
  metricName: string;
  serviceCategory: string;
  currencyCode: string;
  model: string;
  value: number;
  rangeMin?: number;
  rangeMax?: number;
};

export type OracleCloudSkuStat = {
  dateCode: string; //save date with format YYYYMMDD
  partNumber: string;
  displayName: string;
  metricName: string;
  serviceCategory: string;
  value: number;
};
