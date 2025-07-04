import axios, {AxiosError} from 'axios'

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "test"

interface ErrorResponse {
  error?: string;
}

export const getContacts = async (entityId: string, functn: string, term: string) => {
    try{
        const response = await axios.get(backendUrl, {
            params: {
                entityId: entityId,
                function: functn,
                term: term
            }
        })        
        
        if (response.data.status === 200) {
            return { success: true, data: response.data.data };
        } else {
            return { success: false, message: `Error: ${response.data.error}` };
        }
    } catch (error) {
        const axiosError = error as AxiosError<ErrorResponse>;
        return { success: false, message: `Error: ${axiosError.response?.data?.error || axiosError.message}` };
    }
}