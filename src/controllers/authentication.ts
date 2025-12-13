import { Request, Response, NextFunction } from "express";
import {
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { uint8ArrayToBase64, base64ToUint8Array } from "../utils/utils";
import { rpID, origin } from "../utils/constants";
import { credentialService } from "../services/credentialService";
import { userService } from "../services/userService";
import { CustomError } from "../middleware/customError";
import { VerifiedAuthenticationResponse, VerifyAuthenticationResponseOpts } from "@simplewebauthn/server";

export const handleLoginStart = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const { username } = req.body;
    try {
        const user = await userService.getUserByUsername(username);
        if (!user) {
            return next(new CustomError("User not found", 404));
        }

        req.session.loggedInUserId = user.id;

        const options = await generateAuthenticationOptions({
            timeout: 60000,
            allowCredentials: [],
            userVerification: "required",
            rpID,
        });

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

export const handleLoginFinish = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const { body } = req;
    const { currentChallenge, loggedInUserId } = req.session;

    console.log("[LOGIN-FINISH] Starting login finish");
    console.log("[LOGIN-FINISH] Session - loggedInUserId:", loggedInUserId);
    console.log("[LOGIN-FINISH] Request Body (ID):", body.id);

    if (!loggedInUserId) {
        console.error("[LOGIN-FINISH] Error: User ID is missing in session.");
        return next(new CustomError("User ID is missing", 400));
    }

    if (!currentChallenge) {
        console.error("[LOGIN-FINISH] Error: Current challenge is missing in session.");
        return next(new CustomError("Current challenge is missing", 400));
    }

    try {
        console.log("[LOGIN-FINISH] Retrieving credential from DB...");
        const dbCredential = await credentialService.getCredentialByCredentialId(body.id);
        if (!dbCredential) {
             console.error("[LOGIN-FINISH] Credential not found for ID:", body.id);
            return next(new CustomError("Credential not registered with this site", 404));
        }
        
        // dbCredential.publicKey is likely a Base64 string from the DB, even if typed as Uint8Array
        const pubKeyLength = (dbCredential.publicKey as unknown as string).length;
        console.log("[LOGIN-FINISH] Credential found. Public Key length (b64 chars):", pubKeyLength);

        console.log("[LOGIN-FINISH] Retrieving user from DB...");
        const user = await userService.getUserById(loggedInUserId);
        if (!user) {
             console.error("[LOGIN-FINISH] User not found for ID:", loggedInUserId);
            return next(new CustomError("User not found", 404));
        }
        console.log("[LOGIN-FINISH] User found:", user.username);

        console.log("[LOGIN-FINISH] Verifying authentication response...");
        
        // Ensure credentialPublicKey is a Uint8Array
        let credentialPublicKey: Uint8Array;
        if (typeof dbCredential.publicKey === 'string') {
            credentialPublicKey = base64ToUint8Array(dbCredential.publicKey);
        } else {
            credentialPublicKey = dbCredential.publicKey;
        }

        const verification = await verifyAuthenticationResponse({
            response: body,
            expectedChallenge: currentChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            credential: {
                id: dbCredential.id,
                publicKey: credentialPublicKey,
                counter: dbCredential.counter,
                transports: dbCredential.transports,
            },
            requireUserVerification: true,
        } as any);

        console.log("[LOGIN-FINISH] Verification result verified:", verification.verified);

        if (verification.verified) {
            const { authenticationInfo } = verification;
            console.log("[LOGIN-FINISH] Updating counter to:", authenticationInfo.newCounter);
            
            await credentialService.updateCredentialCounter(
                body.id,
                authenticationInfo.newCounter,
            );
            res.send({ verified: true });
        } else {
            console.error("[LOGIN-FINISH] Verification failed.");
            next(new CustomError("Verification failed", 400));
        }
    } catch (error) {
        console.error("[LOGIN-FINISH] Exception:", error);
        next(
            error instanceof CustomError
                ? error
                : new CustomError("Internal Server Error", 500),
        );
    } finally {
        delete req.session.currentChallenge;
        delete req.session.loggedInUserId;
    }
};
