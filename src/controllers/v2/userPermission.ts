import axios from "axios";
import { Request, Response } from "express";
import { Messages, Status } from "../../common/constants";

export const getUserPermission = async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const response: any = await axios.get(
      `${process.env.LAMBDA_URL}/permissions/${userId}`,
      { 
        headers: {
        "x-api-key": process.env.LAMBDA_API_KEY
        } 
      }
    );
    if (response.status === 500) {
      throw new Error(response.permissions.error);
    }

    return res.json({
      status: Status.Success,
      permissions: response.data?.body?.permissions,
    });
  } catch (err) {
    res.status(Status.InternalError).send(Messages.InternalServerError);
  }
};

export const updateUserPermission = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { permissions } = req.body;
  try {
    const response: any = await axios.post(
      `${process.env.LAMBDA_URL}/permissions/${userId}`,
      { permission: permissions },
      { 
        headers: {
        "x-api-key": process.env.LAMBDA_API_KEY
        } 
      }
    );

    if (response.status === 500) {
      throw new Error(response.permissions.error);
    }

    return res.json({
      status: Status.Success,
      permissions: response.data?.body?.permission,
    });

  } catch (err) {
    res.status(Status.InternalError).send(Messages.InternalServerError);
  }
};
