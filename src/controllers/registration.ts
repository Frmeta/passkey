import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { uint8ArrayToBase64 } from "../utils/utils";
import { rpName, rpID, origin } from "../utils/constants";
import { credentialService } from "../services/credentialService";
import { userService } from "../services/userService";
import { Request, Response, NextFunction } from "express";
import { CustomError } from "../middleware/customError";
 
export const handleRegisterStart = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const { username } = req.body;
 
    if (!username) {
        return next(new CustomError("Username empty", 400));
    }
 
    try {
        let user = await userService.getUserByUsername(username);
        if (user) {
            return next(new CustomError("User already exists", 400));
        } else {
            user = await userService.createUser(username);
        }
 
        const options = await generateRegistrationOptions({
            rpName,
            rpID,
            userID: new Uint8Array(Buffer.from(user.id)),
            userName: user.username,
            timeout: 60000,
            attestationType: "direct",
            excludeCredentials: [],
            authenticatorSelection: {
                residentKey: "preferred",
            },
            // Support for the two most common algorithms: ES256, and RS256
            supportedAlgorithmIDs: [-7, -257],
        });
        req.session.loggedInUserId = user.id;
        req.session.currentChallenge = options.challenge;
        res.send(options);
    } catch (error) {
        next(
            error instanceof CustomError
                ? error
                : new CustomError("Internal Server Error", 500),
        );
    }
};
 
export const handleRegisterFinish = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const { body } = req;
    const { currentChallenge, loggedInUserId } = req.session;
    
    console.log("[REG-FINISH] Starting registration finish");
    console.log("[REG-FINISH] Session - loggedInUserId:", loggedInUserId);
    console.log("[REG-FINISH] Session - currentChallenge:", currentChallenge);
    console.log("[REG-FINISH] Request Body (ID):", body.id);

    if (!loggedInUserId) {
        console.error("[REG-FINISH] Error: User ID is missing in session.");
        return next(new CustomError("User ID is missing", 400));
    }
 
    if (!currentChallenge) {
        console.error("[REG-FINISH] Error: Current challenge is missing in session.");
        return next(new CustomError("Current challenge is missing", 400));
    }
 
    try {
        console.log("[REG-FINISH] calling verifyRegistrationResponse with origin:", origin);
        const verification = await verifyRegistrationResponse({
            response: body,
            expectedChallenge: currentChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            requireUserVerification: true,
        });
        
        console.log("[REG-FINISH] Verification result verified:", verification.verified);
 
        if (verification.verified && verification.registrationInfo) {
            const { credential } = verification.registrationInfo;
            const { id, publicKey, counter } = credential;
            
            // Handle transports being array or string or undefined
            let transportsStr = "";
            if (Array.isArray(body.response.transports)) {
                transportsStr = body.response.transports.join(",");
            } else if (typeof body.response.transports === 'string') {
                transportsStr = body.response.transports;
            }

            console.log("[REG-FINISH] Saving credential. ID:", id, "Transports:", transportsStr);

            await credentialService.saveNewCredential(
                loggedInUserId,
                id,
                uint8ArrayToBase64(publicKey),
                counter,
                transportsStr,
            );
            console.log("[REG-FINISH] Credential saved.");
            res.send({ verified: true });
        } else {
            console.error("[REG-FINISH] Verification failed.");
            next(new CustomError("Verification failed", 400));
        }
    } catch (error) {
        console.error("[REG-FINISH] Exception:", error);
        next(
            error instanceof CustomError
                ? error
                : new CustomError("Internal Server Error", 500),
        );
    } finally {
        delete req.session.loggedInUserId;
        delete req.session.currentChallenge;
    }
};
