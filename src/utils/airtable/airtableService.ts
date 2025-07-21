import LeadTracker, { ProcessedLeadData } from '../leadTracking';

interface AirTableRecord {
  fields: {
    [key: string]: any;
  };
}

interface CustomerData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  packages?: string;
  orderTotal?: string;
  orderDate?: string;
  leadData?: ProcessedLeadData;
}

class AirTableService {
  private static readonly API_BASE_URL = 'https://api.airtable.com/v0';
  private static readonly BASE_ID = process.env.AIRTABLE_BASE_ID;
  private static readonly TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'FashoCRM';
  private static readonly API_KEY = process.env.AIRTABLE_API_KEY;

  /**
   * Validate environment variables
   */
  private static validateConfig(): void {
    if (!this.BASE_ID) {
      throw new Error('AIRTABLE_BASE_ID environment variable is required');
    }
    if (!this.API_KEY) {
      throw new Error('AIRTABLE_API_KEY environment variable is required');
    }
  }

  /**
   * Make API request to AirTable
   */
  private static async makeRequest(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<any> {
    this.validateConfig();

    const url = `${this.API_BASE_URL}/${this.BASE_ID}/${this.TABLE_NAME}${endpoint}`;
    
    const headers = {
      'Authorization': `Bearer ${this.API_KEY}`,
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      method,
      headers,
    };

    if (data && (method === 'POST' || method === 'PATCH')) {
      config.body = JSON.stringify(data);
    }

    try {
      console.log(`Making ${method} request to AirTable:`, url);
      console.log('Request data:', data);

      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('AirTable API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`AirTable API Error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('AirTable API Success:', result);
      return result;
    } catch (error) {
      console.error('AirTable request failed:', error);
      throw error;
    }
  }

  /**
   * Get Lead Source ID from the Lead Sources table
   */
  private static async getLeadSourceId(leadSource: string): Promise<string | undefined> {
    try {
      this.validateConfig();
      
      // Map our lead sources to AirTable Lead Sources
      // First, let's get current Lead Sources to see what IDs are available
      let leadSourceMap: { [key: string]: string } = {
        'Google Ads': 'rec39smhVxQY5s5kz',
        'Microsoft Ads': 'recHT63FvJZMIw7hX', // Assuming this exists in your table
        'Google Organic': 'rec39smhVxQY5s5kz', // Map to Google Ads 
        'Bing Organic': 'recHT63FvJZMIw7hX', // Map to Microsoft Ads (closest match)
        'Yahoo Organic': 'rec39smhVxQY5s5kz', // Map to Google Ads (closest match)
        'Direct': 'recVxV4SfYYHQS1WD', // Will update if Direct exists
        'Referral': 'recgWWFdVnAz8Xb0n' // Maps to Referral Program
      };

      // Try to get current Lead Sources to see if Direct/Microsoft Ads exist
      try {
        const leadSourcesUrl = `https://api.airtable.com/v0/${this.BASE_ID}/Lead%20Sources`;
        const response = await fetch(leadSourcesUrl, {
          headers: {
            'Authorization': `Bearer ${this.API_KEY}`,
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          const data = await response.json();
          const sources = data.records || [];
          
          // Look for Direct and Microsoft Ads in your actual table
          sources.forEach((source: any) => {
            const sourceName = source.fields['Source Name'] || source.fields.Name || Object.values(source.fields)[0];
            if (sourceName === 'Direct') {
              leadSourceMap['Direct'] = source.id;
            } else if (sourceName === 'Microsoft Ads') {
              leadSourceMap['Microsoft Ads'] = source.id;
              leadSourceMap['Bing Organic'] = source.id; // Also map Bing to Microsoft
            }
          });
          
          console.log('📊 AIRTABLE: Updated lead source mapping based on actual table');
        }
      } catch (error) {
        console.log('📊 AIRTABLE: Using default lead source mapping');
      }
      
      return leadSourceMap[leadSource];
    } catch (error) {
      console.error('Error getting lead source ID:', error);
      return undefined;
    }
  }

  /**
   * Find existing record by email
   */
  private static async findExistingRecord(email: string): Promise<any> {
    try {
      this.validateConfig();
      
      // Search for existing record by email
      const searchUrl = `?filterByFormula=LOWER({Email})=LOWER("${email}")&maxRecords=1`;
      const result = await this.makeRequest('GET', searchUrl);
      
      if (result.records && result.records.length > 0) {
        console.log('📊 AIRTABLE: Found existing record for email:', email);
        return result.records[0];
      }
      
      console.log('📊 AIRTABLE: No existing record found for email:', email);
      return null;
    } catch (error) {
      console.error('📊 AIRTABLE: Error searching for existing record:', error);
      return null;
    }
  }

  /**
   * Create or update a record in AirTable (upsert functionality)
   */
  public static async createRecord(customerData: CustomerData): Promise<any> {
    const leadData = customerData.leadData || LeadTracker.processLeadDataForSubmission();
    
    // First, try to find existing record
    const existingRecord = await this.findExistingRecord(customerData.email);
    
    // Get Lead Source ID for linking
    const leadSourceId = await this.getLeadSourceId(leadData?.leadSource || 'Direct');
    
    if (existingRecord) {
      console.log('📊 AIRTABLE: Updating existing record:', existingRecord.id);
      return await this.updateExistingRecord(existingRecord, customerData, leadData, leadSourceId);
    } else {
      console.log('📊 AIRTABLE: Creating new record for:', customerData.email);
      return await this.createNewRecord(customerData, leadData, leadSourceId);
    }
  }

  /**
   * Update existing record with new data
   */
  private static async updateExistingRecord(
    existingRecord: any, 
    customerData: CustomerData, 
    leadData: any, 
    leadSourceId: string | undefined
  ): Promise<any> {
    const currentFields = existingRecord.fields;
    const newOrderAmount = customerData.orderTotal ? parseFloat(customerData.orderTotal.replace('$', '')) : 0;
    const currentOrderSpend = currentFields['Order Spend'] || 0;
    
    // Prepare update fields - only update if we have new data or need to add to existing
    const updateFields: any = {};
    
    // Always update Lead Name if we have both first and last name
    if (customerData.firstName && customerData.lastName) {
      updateFields['Lead Name'] = `${customerData.firstName} ${customerData.lastName}`;
    }
    
    // Add to Order Spend (lifetime value)
    if (newOrderAmount > 0) {
      updateFields['Order Spend'] = currentOrderSpend + newOrderAmount;
      console.log(`📊 AIRTABLE: Adding $${newOrderAmount} to existing $${currentOrderSpend} = $${updateFields['Order Spend']}`);
    }
    
    // Update fields only if they're empty or we have better data
    if (customerData.phone && !currentFields['Phone']) {
      updateFields['Phone'] = customerData.phone;
    }
    
    if (customerData.address && !currentFields['Street Address']) {
      updateFields['Street Address'] = customerData.address;
    }
    
    if (customerData.city && !currentFields['City']) {
      updateFields['City'] = customerData.city;
    }
    
    if (customerData.state && !currentFields['State']) {
      updateFields['State'] = customerData.state;
    }
    
    if (customerData.country && !currentFields['Country']) {
      updateFields['Country'] = customerData.country;
    }
    
    if (customerData.zipCode && !currentFields['Zip']) {
      updateFields['Zip'] = customerData.zipCode;
    }
    
    // Update lead tracking info if we have new data
    if (leadData?.campaign && !currentFields['Campaign']) {
      updateFields['Campaign'] = leadData.campaign;
    }
    
    if (leadData?.keyword && !currentFields['Keyword']) {
      updateFields['Keyword'] = leadData.keyword;
    }
    
    // Update Lead Source if we have new data and it's not set
    if (leadSourceId && (!currentFields['Lead Source'] || currentFields['Lead Source'].length === 0)) {
      updateFields['Lead Source'] = [leadSourceId];
    }
    
    // Update Last Interaction Date
    updateFields['Last Interaction Date'] = new Date().toISOString().split('T')[0];
    
    // Only proceed if we have fields to update
    if (Object.keys(updateFields).length === 0) {
      console.log('📊 AIRTABLE: No updates needed for existing record');
      return existingRecord;
    }
    
    console.log('📊 AIRTABLE: Updating fields:', Object.keys(updateFields));
    
    const updatePayload = {
      records: [
        {
          id: existingRecord.id,
          fields: updateFields
        }
      ]
    };
    
    return await this.makeRequest('PATCH', '', updatePayload);
  }

  /**
   * Create new record
   */
  private static async createNewRecord(
    customerData: CustomerData, 
    leadData: any, 
    leadSourceId: string | undefined
  ): Promise<any> {
    // Map customer data to AirTable fields based on actual Leads table structure
    const record: AirTableRecord = {
      fields: {
        // Primary field - combine first and last name
        'Lead Name': `${customerData.firstName} ${customerData.lastName}`,
        
        // Customer Information  
        'Email': customerData.email,
        'Phone': customerData.phone || '',
        'Street Address': customerData.address || '',
        'City': customerData.city || '',
        'State': customerData.state || '',
        'Country': customerData.country || '',
        'Zip': customerData.zipCode || '',
        
        // Order Information - convert to number for currency field
        'Order Spend': customerData.orderTotal ? parseFloat(customerData.orderTotal.replace('$', '')) : 0,
        
        // Lead Tracking Information
        'Campaign': leadData?.campaign || '',
        'Keyword': leadData?.keyword || '',
        
        // Date fields
        'Date Created': customerData.orderDate || new Date().toISOString().split('T')[0],
        'Last Interaction Date': new Date().toISOString().split('T')[0],
        
        // Status
        'Current Status': 'New'
      }
    };

    // Add Lead Source as linked record if we have an ID
    if (leadSourceId) {
      record.fields['Lead Source'] = [leadSourceId];
    }

    // Remove empty fields to keep the record clean
    Object.keys(record.fields).forEach(key => {
      if (record.fields[key] === '' || record.fields[key] === null || record.fields[key] === undefined) {
        delete record.fields[key];
      }
    });

    return await this.makeRequest('POST', '', { records: [record] });
  }

  /**
   * Create customer record for checkout success
   */
  public static async createCheckoutRecord(
    firstName: string,
    lastName: string,
    email: string,
    phone?: string,
    billingInfo?: any,
    packages?: string,
    orderTotal?: number,
    orderId?: string
  ): Promise<any> {
    const customerData: CustomerData = {
      firstName,
      lastName,
      email,
      phone,
      address: billingInfo?.address,
      city: billingInfo?.city,
      state: billingInfo?.state,
      country: billingInfo?.country,
      zipCode: billingInfo?.zip,
      packages,
      orderTotal: orderTotal ? `$${orderTotal.toFixed(2)}` : '',
      orderDate: new Date().toISOString().split('T')[0]
    };

    console.log('Creating AirTable checkout record:', customerData);
    return await this.createRecord(customerData);
  }

  /**
   * Create or update customer record for intake form submission
   */
  public static async createIntakeFormRecord(
    firstName: string,
    lastName: string,
    email: string,
    phone?: string,
    intakeFormResponses?: any
  ): Promise<any> {
    // Find existing record
    const existingRecord = await this.findExistingRecord(email);
    
    if (existingRecord) {
      console.log('📊 AIRTABLE: Updating existing record with intake form data:', existingRecord.id);
      return await this.updateWithIntakeFormData(existingRecord, firstName, lastName, phone, intakeFormResponses);
    } else {
      console.log('📊 AIRTABLE: Creating new record from intake form for:', email);
      
      const customerData: CustomerData = {
        firstName,
        lastName,
        email,
        phone,
        packages: 'Intake Form Submission',
        orderDate: new Date().toISOString().split('T')[0]
      };

      return await this.createRecord(customerData);
    }
  }

  /**
   * Update existing record with intake form data
   */
  private static async updateWithIntakeFormData(
    existingRecord: any,
    firstName: string,
    lastName: string,
    phone?: string,
    intakeFormResponses?: any
  ): Promise<any> {
    const currentFields = existingRecord.fields;
    const updateFields: any = {};

    // Update name if we have better data
    if (firstName && lastName && !currentFields['Lead Name']) {
      updateFields['Lead Name'] = `${firstName} ${lastName}`;
    }

    // Update phone if not set
    if (phone && !currentFields['Phone']) {
      updateFields['Phone'] = phone;
    }

    // Map intake form responses to AirTable fields
    if (intakeFormResponses) {
      // How Long Creating?
      const creatingTime = intakeFormResponses['how-long-creating'] || 
                          intakeFormResponses['creating-time'] || 
                          intakeFormResponses['experience'];
      if (creatingTime && !currentFields['How Long Creating?']) {
        updateFields['How Long Creating?'] = creatingTime;
      }

      // Genre
      const genre = intakeFormResponses['genre'] || 
                   intakeFormResponses['music-genre'] || 
                   intakeFormResponses['style'];
      if (genre && !currentFields['Genre']) {
        updateFields['Genre'] = genre;
      }

      // Age
      const age = intakeFormResponses['age'] || 
                 intakeFormResponses['artist-age'];
      if (age && !currentFields['Age']) {
        updateFields['Age'] = age.toString();
      }

      // Release QTY
      const releaseQty = intakeFormResponses['release-quantity'] || 
                        intakeFormResponses['releases'] || 
                        intakeFormResponses['songs-released'];
      if (releaseQty && !currentFields['Release QTY']) {
        updateFields['Release QTY'] = releaseQty.toString();
      }

      // Promo Platform
      const promoplatform = intakeFormResponses['promo-platform'] || 
                           intakeFormResponses['platforms'] || 
                           intakeFormResponses['promotion-platforms'];
      if (promoplatform && !currentFields['Promo Platform']) {
        updateFields['Promo Platform'] = Array.isArray(promoplatform) ? promoplatform.join(', ') : promoplatform;
      }

      // Online Time
      const onlineTime = intakeFormResponses['online-time'] || 
                        intakeFormResponses['time-online'] || 
                        intakeFormResponses['daily-time'];
      if (onlineTime && !currentFields['Online Time']) {
        updateFields['Online Time'] = onlineTime;
      }
    }

    // Update Last Interaction Date
    updateFields['Last Interaction Date'] = new Date().toISOString().split('T')[0];

    // Update status to show they've completed intake
    if (currentFields['Current Status'] === 'New') {
      updateFields['Current Status'] = 'Contacted';
    }

    console.log('📊 AIRTABLE: Updating with intake form fields:', Object.keys(updateFields));

    const updatePayload = {
      records: [
        {
          id: existingRecord.id,
          fields: updateFields
        }
      ]
    };

    return await this.makeRequest('PATCH', '', updatePayload);
  }

  /**
   * Test the AirTable connection
   */
  public static async testConnection(): Promise<any> {
    try {
      console.log('Testing AirTable connection...');
      
      // Try to get the first few records to test the connection
      const result = await this.makeRequest('GET', '?maxRecords=1');
      
      console.log('AirTable connection test successful:', result);
      return { success: true, message: 'Connection successful', data: result };
    } catch (error) {
      console.error('AirTable connection test failed:', error);
      return { success: false, message: error.message, error };
    }
  }
}

export default AirTableService;
export type { CustomerData }; 