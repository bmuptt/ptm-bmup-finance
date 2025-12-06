import { Request, Response, NextFunction } from 'express';
import { AxiosError } from 'axios';
import { createFlexibleHttpClient } from '../config/axios';
import { config } from '../config/environment';
import { ResponseError } from '../config/response-error';
import '../model'; // Import to extend Express Request interface

export const verifyCoreToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get token from cookie (httpOnly and secure cookies are accessible server-side)
    // cookie-parser automatically parses cookies from Cookie header
    // For httpOnly and secure cookies, they are still accessible via req.cookies on server-side
    const token = req.cookies?.token || null;

    if (!token) {
      throw new ResponseError(401, 'Unauthorized. Missing token cookie.');
    }

    // Call core service to verify token and get profile
    let responseData: any;
    
    try {
      const flexibleClient = createFlexibleHttpClient();
      const response = await flexibleClient.get(`${config.API_URL_CORE}/profile`, {
        headers: {
          'Cookie': `token=${token}`
        }
      });

      // Extract data from AxiosResponse
      // response is an AxiosResponse object, so response.data contains the actual response body
      const rawResponseData = (response as any)?.data !== undefined 
        ? (response as any).data 
        : response;

      responseData = rawResponseData;
    } catch (error) {
      const err = error as AxiosError;
      // Convert Axios errors to ResponseError
      if (err instanceof AxiosError) {
        const status = err.response?.status ?? 500;
        const data = err.response?.data as any;
        const message =
          (data && Array.isArray(data.errors) && data.errors.join(', ')) ||
          (data && (data.message || data.error)) ||
          err.message ||
          'Core service error';
        throw new ResponseError(status, message);
      }
      throw error;
    }

    // Handle different response structures from core service
    // Possible structures:
    // 1. { success: true, data: { message: 'Success', profile: {...}, menu: [...] } }
    // 2. { message: 'Success', profile: {...}, menu: [...] }
    // 3. { data: { message: 'Success', profile: {...}, menu: [...] } }
    
    const beforeParsing = {
      hasSuccess: !!(responseData && typeof responseData === 'object' && responseData.success),
      hasData: !!(responseData && typeof responseData === 'object' && responseData.data),
      hasProfile: !!(responseData && typeof responseData === 'object' && responseData.profile),
      keys: responseData && typeof responseData === 'object' ? Object.keys(responseData) : [],
    };
    
    // Case 1: Response wrapped in success/data structure
    // Extract data if response has success and data properties
    if (responseData && typeof responseData === 'object') {
      if (responseData.success && responseData.data && typeof responseData.data === 'object') {
        responseData = responseData.data;
      }
      // Case 2: Response wrapped in data property only (no success property)
      // Extract data if response has data property but no profile directly
      else if (responseData.data && typeof responseData.data === 'object' && !responseData.profile) {
        if (responseData.data.profile) {
          responseData = responseData.data;
        }
      }
    }
    
    // Case 3: Response is already in the correct format: { message: 'Success', profile: {...}, menu: [...] }
    // responseData already has profile, no need to change
    
    // Validate response data structure
    if (!responseData || !responseData.profile) {
      const errorDetails = {
        responseData,
        responseDataType: typeof responseData,
        hasProfile: !!responseData?.profile,
        responseKeys: responseData ? Object.keys(responseData) : [],
        hasNestedData: !!responseData?.data,
        nestedDataKeys: responseData?.data ? Object.keys(responseData.data) : [],
        responseDataFull: responseData && typeof responseData === 'object' 
          ? JSON.stringify(responseData).substring(0, 2000) 
          : String(responseData).substring(0, 500),
      };
      
      throw new ResponseError(500, 'Invalid response from authentication service.');
    }

    // Validate required profile fields
    const profile = responseData.profile;
    const profileValidation = {
      hasId: !!profile.id,
      hasName: !!profile.name,
      hasEmail: !!profile.email,
      hasRole: !!profile.role,
      hasRoleId: !!profile.role_id,
      profileKeys: Object.keys(profile || {}),
      profileData: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        roleExists: !!profile.role,
        roleIdExists: !!profile.role_id,
        roleId: profile.role_id,
      },
    };
    
    
    // Check if profile has required fields (id, name, email)
    if (!profile.id || !profile.name || !profile.email) {
      const errorDetails = {
        profile,
        profileValidation,
        missingFields: {
          id: !profile.id,
          name: !profile.name,
          email: !profile.email,
          role: !profile.role,
          role_id: !profile.role_id,
        },
        responseData,
        responseDataKeys: responseData && typeof responseData === 'object' ? Object.keys(responseData) : [],
        responseDataFull: responseData && typeof responseData === 'object' 
          ? JSON.stringify(responseData).substring(0, 2000) 
          : String(responseData).substring(0, 500),
      };
      
      throw new ResponseError(500, 'Invalid user profile data from authentication service.');
    }
    
    // Handle role: if only role_id exists, construct a minimal role object as workaround
    // This is a temporary fix until core service is updated to return full role object
    if (!profile.role && profile.role_id) {
      // Create minimal role object with id from role_id and default name
      // Note: This is a workaround. Core service should return full role object with name
      profile.role = {
        id: profile.role_id,
        name: 'Unknown', // Default name since we don't have it from core service
        created_by: 0,
        created_at: new Date().toISOString(),
        updated_by: null,
        updated_at: new Date().toISOString(),
      };
    }
    
    // If still no role object and no role_id, throw error
    if (!profile.role) {
      const errorDetails = {
        profile,
        profileValidation,
        missingFields: {
          role: !profile.role,
          role_id: !profile.role_id,
        },
        hasRoleId: !!profile.role_id,
        roleId: profile.role_id,
        responseData,
        responseDataKeys: responseData && typeof responseData === 'object' ? Object.keys(responseData) : [],
        responseDataFull: responseData && typeof responseData === 'object' 
          ? JSON.stringify(responseData).substring(0, 2000) 
          : String(responseData).substring(0, 500),
      };
      
      throw new ResponseError(500, 'Profile from core service missing both role object and role_id.');
    }

    // Validate role structure
    if (!profile.role.id || !profile.role.name) {
      const roleValidation = {
        hasRoleId: !!profile.role.id,
        hasRoleName: !!profile.role.name,
        roleData: profile.role,
      };
      
      throw new ResponseError(500, 'Invalid role data from authentication service.');
    }
    
    // Store validated user profile and menu data in request
    req.user = profile;
    req.menu = responseData.menu || []; // Menu is optional, default to empty array

    next();
  } catch (error) {
    
    // Handle different types of errors
    // For async middleware in Express, we should use next(error) to pass error to error handler
    // But throwing also works if Express handles it properly
    let errorToPass: ResponseError;
    
    if (error instanceof ResponseError) {
      // Use existing ResponseError
      errorToPass = error;
    } else if (error instanceof Error) {
      if (error.message.includes('401')) {
        errorToPass = new ResponseError(401, 'Unauthorized. Invalid token.');
      } else if (error.message.includes('Network error')) {
        errorToPass = new ResponseError(503, 'Service unavailable. Core service is down.');
      } else {
        errorToPass = new ResponseError(500, 'Internal server error during authentication.');
      }
    } else {
      errorToPass = new ResponseError(500, 'Internal server error during authentication.');
    }
    
    // Pass error to Express error handler using next()
    // This ensures error handler is called even if Express doesn't auto-catch async errors
    next(errorToPass);
  }
};

// Optional middleware for role-based access control
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new ResponseError(401, 'Unauthorized. User not authenticated.');
      }

      const userRole = req.user.role.name;
      
      if (!allowedRoles.includes(userRole)) {
        throw new ResponseError(403, 'Forbidden. Insufficient permissions.');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Optional middleware for checking specific permissions
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new ResponseError(401, 'Unauthorized. User not authenticated.');
      }

      // Check if user has access to the specific menu/permission
      const hasPermission = req.menu?.some(menu => 
        menu.key_menu === permission || 
        menu.children?.some(child => child.key_menu === permission)
      );

      if (!hasPermission) {
        throw new ResponseError(403, 'Forbidden. You do not have permission to access this resource.');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default verifyCoreToken;
