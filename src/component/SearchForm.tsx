'use client';

import React, {useRef, useState, useEffect} from "react";
import Select, {SingleValue} from 'react-select';
import committeData from '@/data/committee_data.json'
import constantsVals from "@/data/constants.json";
import { getContacts } from "@/api/GetContacts";
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Snackbar,
  Alert
} from '@mui/material';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

type Option = {
    label: string;
    value: string;
}

type LC = {
    id: string;
    name: string;
}

type MC = {
    id: string;
    name: string;
    lcs: LC[];
}

type Region = {
    id: string;
    name: string;
    mcs: MC[];
}

const regions: Region[] = committeData.data.committee.regions;

export default function SearchForm() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    const [selectedRegion, setSelectedRegion] = useState<Option | null>(null);
    const [selectedMC, setSelectedMC] = useState<Option | null>(null);
    const [selectedLC, setSelectedLC] = useState<Option | null>(null);
    const [selectedFunction, setSelectedFunction] = useState<Option | null>(null);
    const [selectedTerm, setSelectedTerm] = useState<Option | null>(null);
    const [selectedEntity, setSelectedEntity] = useState<Option | null>(null);

    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<string[][] | null>(null);
    const [error, setError] = useState<string | null>(null);

    const resultsRef = useRef<HTMLDivElement>(null);
    const cacheRef = useRef<Record<string, string[][]>>({});

    // Parse URL on first load
    useEffect(() => {
        const getOption = (id: string | null, list: Option[]): Option | null => {
            if (!id) return null;
            return list.find((item) => item.value === id) || null;
        };

        const regionOption = getOption(searchParams.get('region'), regionOptions);
        const mcOption = getOption(searchParams.get('mc'), mcOptions);
        const lcOption = getOption(searchParams.get('lc'), lcOptions);
        const funcOption = getOption(searchParams.get('func'), functionOptions);
        const termOption = getOption(searchParams.get('term'), termOptions);

        setSelectedRegion(regionOption);
        setSelectedMC(mcOption);
        setSelectedLC(lcOption);
        setSelectedFunction(funcOption);
        setSelectedTerm(termOption);
        setSelectedEntity(lcOption || mcOption);
    }, [searchParams]);

    useEffect(() => {
        if (results && resultsRef.current) {
        resultsRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [results]);

    const functionOptions: Option[] = constantsVals.functions.map((func, ind) => ({
        value: ind.toString(),
        label: func
    }));

    const termOptions: Option[] = constantsVals.terms.map((term, ind) => ({
        value: ind.toString(),
        label: term
    }));

    const regionOptions: Option[] = regions.map((region: Region) => ({
        value: region.id,
        label: region.name,
    }));

    const mcOptions: Option[] = 
        selectedRegion != null
            ? regions
                .find((region: Region) => region.id === selectedRegion.value)
                ?.mcs.map((mc: MC) => ({ value: mc.id, label: mc.name })) || []
            : (() => {
            const mclist: Option[] = []
            for (const region of regions) {
                for (const mc of region.mcs) {
                    mclist.push({ value: mc.id, label: mc.name })
                }
            }
            mclist.sort((a, b) => a.label.localeCompare(b.label))
            return mclist
        })();

    const lcOptions: Option[] =
        selectedMC != null
            ? (() => {
                for (const region of regions) {
                    const mc = region.mcs.find((mc: MC) => mc.id === selectedMC.value);
                    if (mc) {
                        return mc.lcs.map((lc: LC) => ({ value: lc.id, label: lc.name }));
                    }
                }
                return [];
            })()
            : selectedRegion
            ? (() => {
                const lclist: Option[] = []
                for (const mc of regions.find(r => r.id === selectedRegion.value)?.mcs || []) {
                    for (const lc of mc.lcs) {
                        lclist.push({ value: lc.id, label: lc.name })
                    }
                }
                return lclist;
            })()
        : (() => {
            const lclist: Option[] = []
            for (const region of regions) {
                for (const mc of region.mcs) {
                    for (const lc of mc.lcs) {
                        lclist.push({ value: lc.id, label: lc.name })
                    }
                }
            }
            return lclist
        })();

    const handleLCChange = (selected: SingleValue<Option>) => {
        setSelectedLC(selected);

        if (selected) {
            setSelectedEntity(selected)
            for (const region of regions) {
                for (const mc of region.mcs) {
                    const lc = mc.lcs.find((lc: LC) => lc.id === selected.value);
                    if (lc) {
                        setSelectedRegion({ value: region.id, label: region.name });
                        setSelectedMC({ value: mc.id, label: mc.name });
                        console.log(`Selected LC: ${lc.name}`);
                        return;
                    }
                }
            }
        };

        setSelectedEntity(selectedMC);
    };

    const handleMCChange = (selected: SingleValue<Option>) => {
        setSelectedMC(selected);
        setSelectedLC(null);
        setSelectedEntity(selected);

        if (selected) {
            for (const region of regions) {
                const mc = region.mcs.find((mc: MC) => mc.id === selected.value);
                if (mc) {
                    setSelectedRegion({ value: region.id, label: region.name });
                    console.log(`Selected MC: ${mc.name}`);
                    return;
                }
            }
        }
    };

    const handleRegionChange = (selected: SingleValue<Option>) => {
        if (selectedRegion && selected?.value !== selectedRegion.value) {
            setSelectedMC(null);
            setSelectedLC(null);
        }
        setSelectedRegion(selected);
        console.log(`Selected Region: ${selected?.label}`);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setResults(null);
        setLoading(true);
        setError(null);
        
        if (selectedTerm && selectedEntity && selectedFunction) {
            const queryKey = `${selectedEntity.value}-${selectedFunction.label}-${selectedTerm.label}`;
            const cached = cacheRef.current[queryKey]

            const params = new URLSearchParams();
            if (selectedRegion) params.set('region', selectedRegion.value);
            if (selectedMC) params.set('mc', selectedMC.value);
            if (selectedLC) params.set('lc', selectedLC.value);
            if (selectedFunction) params.set('func', selectedFunction.value);
            if (selectedTerm) params.set('term', selectedTerm.value);
            router.push(`${pathname}?${params.toString()}`);

            if (cached) {
                setResults(cached);
                setLoading(false);
                return;
            }

            const response = await getContacts(selectedEntity.value, selectedFunction.label, selectedTerm.label);
            if (response.success) {
                cacheRef.current[queryKey] = response.data;
                setResults(response.data);
            } else {
                setError(response.message || "'Unknown error occurred when fetching contacts. Please try again.");
            }
            setLoading(false);
        } else {
            setError('Please complete all fields before submitting.');
            setLoading(false);
        }
    };

    return (
        <Box display="flex" flexDirection="column" alignItems="center" p={4} >
            <Box width="100%" maxWidth={600} p={4} borderRadius={2} boxShadow={3} bgcolor="rgba(3, 126, 243)">
            <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 600 }}>
                <Box mb={2}><Typography variant="h6" textAlign="center">Search Contact Info</Typography></Box>
                <Select options={termOptions} value={selectedTerm} onChange={setSelectedTerm} required isClearable placeholder="Select the Term" />
                <Box mt={2} />
                <Select options={functionOptions} value={selectedFunction} onChange={setSelectedFunction} required isClearable placeholder="Select the function" />
                <Box mt={2} />
                <Select options={regionOptions} value={selectedRegion} onChange={handleRegionChange} required isClearable placeholder="Select the Region" />
                <Box mt={2} />
                <Select options={mcOptions} value={selectedMC} onChange={handleMCChange} required isClearable placeholder="Select the MC" />
                <Box mt={2} />
                <Select options={lcOptions} value={selectedLC} onChange={handleLCChange} isClearable placeholder="Select the LC (Optional)" />
                <Box mt={3} textAlign="center">
                    <Button variant="contained" color="info" type="submit">Search</Button>
                </Box>
            </form>
            </Box>

            {loading && <Box mt={4}><CircularProgress sx={{ color: 'inherit' }} /></Box>}

            {error && (
                <Snackbar open autoHideDuration={6000} onClose={() => setError(null)}>
                    <Alert severity="error" variant="filled" onClose={() => setError(null)}>{error}</Alert>
                </Snackbar>
            )}

            {results && (
                <Box ref={resultsRef} mt={6} width="100%" maxWidth={900} p={4} borderRadius={2} boxShadow={3} bgcolor="rgba(3, 126, 243)">
                    <Typography variant="subtitle1" mb={2} textAlign="center">
                        Search results for <strong>{selectedEntity?.label}</strong>, function <strong>{selectedFunction?.label}</strong>
                    </Typography>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>Name</strong></TableCell>
                                    <TableCell><strong>Email</strong></TableCell>
                                    <TableCell><strong>Telegram ID</strong></TableCell>
                                    <TableCell><strong>Contact No</strong></TableCell>
                                    <TableCell><strong>Title</strong></TableCell>
                                    <TableCell><strong>Role</strong></TableCell>
                                    <TableCell><strong>Department</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {results.map((row, idx) => (
                                    <TableRow key={idx}>
                                        {row.map((cell, i) => <TableCell key={i}>{cell}</TableCell>)}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            )}
        </Box>
    );
}