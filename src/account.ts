import {bypassLogin} from "./battle-scene";
import * as Utils from "./utils";
import {auth, db} from "#app/server/firebase";
import {doc, getDoc, setDoc, deleteDoc, serverTimestamp} from "firebase/firestore";
import {
    getAuth,
    createUserWithEmailAndPassword as firebaseCreateUser,
    signInWithEmailAndPassword as firebaseSignIn,
    signOut,
    deleteUser,
    reauthenticateWithCredential,
    EmailAuthProvider
} from "firebase/auth";
import {FirebaseError} from 'firebase/app';
import {SessionSaveData, SystemSaveData} from "#app/system/game-data";

export interface UserInfo {
    username: string;
    lastSessionSlot: integer;
    discordId: string;
    googleId: string;
    hasAdminRole: boolean;
}

export let loggedInUser: UserInfo | null = null;
export const clientSessionId = Utils.randomString(32);

export function initLoggedInUser(): void {
    loggedInUser = {username: "Champion", lastSessionSlot: -1, discordId: "", googleId: "", hasAdminRole: false};
}

export function updateUserInfo(): Promise<[boolean, number]> {
    return new Promise<[boolean, number]>(async (resolve) => {
        loggedInUser = {username: "Champion", lastSessionSlot: -1, discordId: "", googleId: "", hasAdminRole: false};
        let lastSessionSlot = -1;
        for (let s = 0; s < 5; s++) {
            if (localStorage.getItem(`sessionData${s ? s : ""}_${loggedInUser.username}`)) {
                lastSessionSlot = s;
                break;
            }
        }
        loggedInUser.lastSessionSlot = lastSessionSlot;
        ["data", "sessionData", "sessionData1", "sessionData2", "sessionData3", "sessionData4"].map(d => {
            const lsItem = localStorage.getItem(d);
            if (lsItem && !!loggedInUser?.username) {
                const lsUserItem = localStorage.getItem(`${d}_${loggedInUser.username}`);
                if (lsUserItem) {
                    localStorage.setItem(`${d}_${loggedInUser.username}_bak`, lsUserItem);
                }
                localStorage.setItem(`${d}_${loggedInUser.username}`, lsItem);
                localStorage.removeItem(d);
            }
        });
        return resolve([true, 200]);
    });
}

function prepareDataForFirestore(data: any): any {
    if (typeof data !== 'object' || data === null) {
        return data;
    }

    if (Array.isArray(data)) {
        return data.map(prepareDataForFirestore);
    }

    const result: { [key: string]: any } = {};
    for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
            if (typeof value === 'bigint') {
                result[key] = value.toString();
            } else {
                result[key] = prepareDataForFirestore(value);
            }
        }
    }

    return result;
}

function validateFirestoreData(data: any): boolean {
    if (typeof data !== 'object' || data === null) {
        return true;
    }

    if (Array.isArray(data)) {
        return data.every(validateFirestoreData);
    }

    for (const value of Object.values(data)) {
        if (typeof value === 'function' || typeof value === 'symbol' || value === undefined) {
            return false;
        }
        if (!validateFirestoreData(value)) {
            return false;
        }
    }

    return true;
}

export async function transferSave(username: string, password: string, systemData: object, sessionData: object[]): Promise<{
    success: boolean,
    error?: string
}> {
    try {
        await firebaseCreateUser(auth, username, password);

        const user = auth.currentUser;
        if (!user) return {success: false, error: "Failed to create user"};

        const preparedSystemData = prepareDataForFirestore(systemData);
        const preparedSessionData = sessionData.map(session => prepareDataForFirestore(session));

        if (!validateFirestoreData(preparedSystemData) || !preparedSessionData.every(validateFirestoreData)) {
            throw new Error("Invalid data structure for Firestore");
        }

        await setDoc(doc(db, "transfers", user.uid), {
            systemData: preparedSystemData,
            sessionData: preparedSessionData,
            createdAt: serverTimestamp()
        });

        await signOut(auth);

        return {success: true};
    } catch (error) {
        console.error("Transfer SAVE Error:", error);
        console.error("Error stack:", error.stack);

        if (error instanceof FirebaseError) {
            console.error("Firebase Error Code:", error.code);
            console.error("Firebase Error Message:", error.message);
        }

        if (auth.currentUser) {
            try {
                const credential = EmailAuthProvider.credential(username, password);
                await reauthenticateWithCredential(auth.currentUser, credential);

                await deleteUser(auth.currentUser);
                console.log("User account deleted due to transferSave error.");
            } catch (deleteError) {
                console.error("Failed to delete user account after transferSave error:", deleteError);
                await signOut(auth);
            }
        }

        if (error instanceof FirebaseError) {
            switch (error.code) {
                case 'auth/email-already-in-use':
                    return {success: false, error: "Email already in use"};
                case 'auth/invalid-email':
                    return {success: false, error: "Invalid email format"};
                case 'auth/weak-password':
                    return {success: false, error: "Password is too weak"};
                default:
                    return {success: false, error: `Firebase error: ${error.code}`};
            }
        }
        return {success: false, error: "An unexpected error occurred"};
    }
}

export async function transferLoad(username: string, password: string): Promise<{
    success: boolean,
    data?: { systemData: SystemSaveData, sessionData: SessionSaveData[] },
    error?: string
}> {
    try {
        await firebaseSignIn(auth, username, password);

        const user = auth.currentUser;
        if (!user) return {success: false, error: "Failed to sign in"};

        const docRef = doc(db, "transfers", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            let systemData = prepareDataForFirestore(data.systemData);
            let sessionData = data.sessionData.map((session: any) => prepareDataForFirestore(session));


            try {
            } catch (deleteError) {
                console.error("Error deleting user account:", deleteError);
                return {success: false, error: "Failed to delete user account"};
            }

            await signOut(auth);

            return {
                success: true,
                data: {
                    systemData: systemData as SystemSaveData,
                    sessionData: sessionData as SessionSaveData[]
                }
            };
        } else {
            await signOut(auth);
            return {success: false, error: "No transfer data found for user"};
        }
    } catch (error) {
        console.error("Transfer LOAD Error:", error);
        if (error instanceof FirebaseError) {
            switch (error.code) {
                case 'auth/user-not-found':
                    return {success: false, error: "User not found"};
                case 'auth/wrong-password':
                    return {success: false, error: "Incorrect password"};
                case 'auth/invalid-email':
                    return {success: false, error: "Invalid email format"};
                case 'auth/requires-recent-login':
                    return {success: false, error: "Please re-authenticate and try again"};
                default:
                    return {success: false, error: `Firebase error: ${error.code}`};
            }
        }
        return {success: false, error: "An unexpected error occurred"};
    }
}