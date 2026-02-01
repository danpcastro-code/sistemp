
import React, { useState, useMemo, useRef } from 'react';
import { CandidatoNomeado, Unidade, Cargo, Alocacao, Portaria, User, UserRole } from '../types';

interface NominatedCandidatesProps {
  nomeados: CandidatoNomeado[];
  unidades: Unidade[];
  cargos: Cargo[];
  alocacoes: Alocacao[];
  portarias: Portaria[];
  user: User;
  onImport: (newList: CandidatoNomeado[]) => void;
  onUpdateCandidato: (id: string, updated: Partial<CandidatoNomeado>) => void;
  onDeleteCandidato: (id: string) => void;
}

const NominatedCandidates: React.FC<NominatedCandidatesProps> = ({ 
  nomeados, unidades, cargos, portarias, user, onImport, onUpdateCandidato
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [allocatingId, setAllocatingId] = useState<string | null>(null);
  const [dateModal, setDateModal] = useState<{ id: string, type: 'posse' | 'exercicio' } | null>(null);
  const [contractModal, setContractModal] = useState<CandidatoNomeado | null>(null);
  const [isNewRecordModalOpen, setIsNewRecordModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  
  const [editForm, setEditForm] = useState({ uorgId: '', linkCurriculo: '', cargoId: '', portariaId: '' });
  const [contractForm, setContractForm] = useState({ dataInicioContrato: '', prorrogacoes: 0 });
  const [newRecordForm, setNewRecordForm] = useState({ nome: '', cpf: '', carreira: '', cargo: '', linkCurriculo: '' });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = user.perfil === UserRole.ADMIN;

  // Função de Máscara Robusta (Privacy by Design)
  const maskCPF = (cpf: string): string => {
    // Se já estiver mascarado, retorna como está
    if (cpf.includes('*') || cpf.includes('X')) return cpf;
    
    const cleanCPF = cpf.replace(/\D/g, '');
    if (cleanCPF.length !== 11) return '***.XXX.XXX-**';
    
    // Padrão solicitado: ***.XXX.XXX-** preservando apenas os 6 dígitos centrais para conferência mínima
    return `***.${cleanCPF.substring(3, 6)}.${cleanCPF.substring(6, 9)}-**`;
  };

  const calculateDeadline = (baseDateStr: string, daysToAdd: number): Date => {
    const date = new Date(baseDateStr + 'T12:00:00');
    date.setDate(date.getDate() + daysToAdd);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0) date.setDate(date.getDate() + 1);
    else if (dayOfWeek === 6) date.setDate(date.getDate() + 2);
    return date;
  };

  const handleDateConfirm = () => {
    setError('');
    const candidato = nomeados.find(n => n.id === dateModal?.id);
    if (!candidato || !dateModal) return;

    const chosenDate = new Date(selectedDate + 'T12:00:00');

    if (dateModal.type === 'posse') {
      const portaria = portarias.find(p => p.id === candidato.portariaId);
      if (!portaria) { setError("Portaria vinculada não encontrada."); return; }
      const deadline = calculateDeadline(portaria.dataPublicacao, 30);
      if (chosenDate > deadline) { setError(`Ato Inválido: Prazo para posse expirou em ${deadline.toLocaleDateString()}.`); return; }
      onUpdateCandidato(candidato.id, { dataPosse: selectedDate });
    } else {
      if (!candidato.dataPosse) return;
      const deadline = calculateDeadline(candidato.dataPosse, 15);
      if (chosenDate > deadline) { setError(`Ato Inválido: Prazo para exercício expirou em ${deadline.toLocaleDateString()}.`); return; }
      onUpdateCandidato(candidato.id, { dataExercicio: selectedDate, dataInicioContrato: selectedDate });
    }
    setDateModal(null);
  };

  const handleContractSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (contractModal) {
      onUpdateCandidato(contractModal.id, { 
        dataInicioContrato: contractForm.dataInicioContrato,
        prorrogacoes: contractForm.prorrogacoes
      });
      setContractModal(null);
    }
  };

  const handleNewRecordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const masked = maskCPF(newRecordForm.cpf);
    const newCandidate: CandidatoNomeado = {
      id: Math.random().toString(36).substr(2, 9),
      nome: newRecordForm.nome,
      cpf: masked, 
      carreira: newRecordForm.carreira,
      cargo: newRecordForm.cargo,
      linkCurriculo: newRecordForm.linkCurriculo,
      dataImportacao: new Date().toISOString(),
      prorrogacoes: 0,
      secretaria: '',
      diretoria: ''
    };
    onImport([newCandidate]);
    setIsNewRecordModalOpen(false);
    setNewRecordForm({ nome: '', cpf: '', carreira: '', cargo: '', linkCurriculo: '' });
  };

  const downloadCSVModel = () => {
    const headers = ["nome", "cpf", "carreira", "cargo", "linkCurriculo"];
    const exampleRow = ["Ana Souza", "11122233344", "EPPGG", "Analista Pleno", "https://linkedin.com/in/anasouza"];
    const csvContent = "\ufeffsep=;\n" + headers.join(";") + "\n" + exampleRow.join(";");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "modelo_importacao_CPNU.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rawLines = text.split(/\r?\n/).filter(line => line.trim() !== '' && !line.startsWith('sep='));
        const delimiter = rawLines[0].includes(';') ? ';' : ',';
        const headers = rawLines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/^\ufeff/, ""));
        const imported: CandidatoNomeado[] = rawLines.slice(1).map(line => {
          const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ""));
          const obj: any = {};
          headers.forEach((header, index) => { obj[header] = values[index]; });
          return {
            id: Math.random().toString(36).substr(2, 9),
            nome: obj.nome || 'N/A',
            cpf: maskCPF(obj.cpf || ''), 
            carreira: obj.carreira || '',
            cargo: obj.cargo || '',
            linkCurriculo: obj.linkcurriculo || '',
            dataImportacao: new Date().toISOString(),
            prorrogacoes: 0,
            secretaria: '',
            diretoria: ''
          } as CandidatoNomeado;
        });
        onImport(imported);
      } catch (err) { alert("Erro no processamento."); }
      finally { setIsImporting(false); if(fileInputRef.current) fileInputRef.current.value = ''; }
    };
    reader.readAsText(file);
  };

  const filteredCandidates = useMemo(() => {
    return nomeados.filter(c => c.nome.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [nomeados, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">Ciclo de Provimento</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gestão Normativa de Ingressos e Contratos</p>
        </div>
        
        <div className="flex items-stretch bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-700">
          <button onClick={() => {
            setNewRecordForm({ nome: '', cpf: '', carreira: '', cargo: '', linkCurriculo: '' });
            setIsNewRecordModalOpen(true);
          }} className="px-6 py-4 bg-blue-600 text-white hover:bg-blue-700 border-r border-slate-700 transition-colors flex items-center justify-center group">
            <span className="text-xl group-hover:rotate-90 transition-transform">＋</span>
            <div className="flex flex-col items-start ml-3">
              <span className="text-[9px] font-black uppercase text-white">Novo Registro</span>
              <span className="text-[7px] font-bold uppercase text-blue-200 text-left">Cadastro Individual</span>
            </div>
          </button>
          <button onClick={downloadCSVModel} className="px-6 py-4 bg-slate-800 text-slate-400 hover:text-white border-r border-slate-700 transition-colors flex items-center justify-center group">
            <span className="text-xl group-hover:scale-110 transition-transform">📊</span>
            <div className="flex flex-col items-start ml-3">
              <span className="text-[9px] font-black uppercase text-white">Baixar Modelo</span>
              <span className="text-[7px] font-bold uppercase text-slate-500">Formato: CSV (;)</span>
            </div>
          </button>
          <label className={`cursor-pointer text-white px-8 py-4 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3 ${isImporting ? 'opacity-50' : 'hover:bg-slate-700'}`}>
            <span>📥 Importar Lote</span>
            <input type="file" ref={fileInputRef} accept=".csv" className="hidden" onChange={handleFileChange} disabled={isImporting} />
          </label>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b bg-slate-50/50">
          <input type="text" placeholder="Localizar servidor nomeado..." className="w-full pl-6 pr-6 py-4 rounded-2xl border-2 border-slate-100 text-sm font-bold outline-none focus:border-blue-500 transition-all shadow-inner" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b tracking-widest">
            <tr>
              <th className="px-10 py-5">Identificação</th>
              <th className="px-10 py-5">UORG SIORG</th>
              <th className="px-10 py-5">Contrato / Prorr.</th>
              <th className="px-10 py-5">Situação Legal</th>
              <th className="px-10 py-5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCandidates.map(c => {
              const unidade = unidades.find(u => u.uorg === c.uorgId);
              const status = c.dataExercicio ? 'exercicio' : c.dataPosse ? 'posse' : c.uorgId ? 'vinculado' : 'nomeado';
              return (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-10 py-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{c.nome}</span>
                      <span className="text-[9px] text-blue-600 font-mono font-bold tracking-tighter">CPF: {c.cpf}</span>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <span className={`text-[10px] font-black px-3 py-1.5 rounded-lg border ${unidade ? 'text-blue-700 bg-blue-50 border-blue-100' : 'text-slate-300 border-slate-100'}`}>
                      {unidade?.sigla || 'Pendente'}
                    </span>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-600">
                        {c.dataInicioContrato ? new Date(c.dataInicioContrato).toLocaleDateString() : '—'}
                      </span>
                      <span className="text-[8px] font-bold text-amber-600 uppercase">Prorrogações: {c.prorrogacoes || 0}</span>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${status === 'exercicio' ? 'bg-emerald-500' : status === 'posse' ? 'bg-amber-500' : 'bg-slate-300'}`} />
                      <span className="text-[10px] font-black uppercase text-slate-500">{status}</span>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isAdmin && (
                        <button onClick={() => { setContractModal(c); setContractForm({ dataInicioContrato: c.dataInicioContrato || '', prorrogacoes: c.prorrogacoes || 0 }); }} className="bg-slate-900 text-white p-2.5 rounded-xl hover:bg-blue-600 shadow-md transition-all" title="Gerenciar Contrato (Admin Only)">
                          🛡️
                        </button>
                      )}
                      {!c.uorgId && <button onClick={() => { setAllocatingId(c.id); setEditForm({uorgId: '', cargoId: '', portariaId: '', linkCurriculo: c.linkCurriculo || ''}); }} className="bg-slate-100 text-slate-900 px-4 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-slate-900 hover:text-white">Pactuar</button>}
                      {c.uorgId && !c.dataPosse && <button onClick={() => { setDateModal({ id: c.id, type: 'posse' }); setSelectedDate(new Date().toISOString().split('T')[0]); }} className="bg-amber-500 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-amber-600">Posse</button>}
                      {c.dataPosse && !c.dataExercicio && <button onClick={() => { setDateModal({ id: c.id, type: 'exercicio' }); setSelectedDate(new Date().toISOString().split('T')[0]); }} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-emerald-700">Exercício</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL: NOVO REGISTRO (CADASTRO MANUAL) */}
      {isNewRecordModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl p-10 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-8 italic">Cadastrar Convocado</h3>
            <form onSubmit={handleNewRecordSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input required type="text" className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl px-5 py-4 text-sm font-black outline-none focus:border-blue-500 uppercase" value={newRecordForm.nome} onChange={e => setNewRecordForm({...newRecordForm, nome: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">CPF (MASCARADO ON-BLUR)</label>
                  <input 
                    required 
                    type="text" 
                    maxLength={14} 
                    placeholder="000.000.000-00" 
                    className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl px-5 py-4 text-sm font-black outline-none focus:border-blue-500" 
                    value={newRecordForm.cpf} 
                    onChange={e => setNewRecordForm({...newRecordForm, cpf: e.target.value})}
                    onBlur={() => setNewRecordForm(prev => ({ ...prev, cpf: maskCPF(prev.cpf) }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Carreira</label>
                  <input required type="text" className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl px-5 py-4 text-sm font-black outline-none focus:border-blue-500" value={newRecordForm.carreira} onChange={e => setNewRecordForm({...newRecordForm, carreira: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cargo</label>
                  <input required type="text" className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl px-5 py-4 text-sm font-black outline-none focus:border-blue-500" value={newRecordForm.cargo} onChange={e => setNewRecordForm({...newRecordForm, cargo: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Link do Currículo (Lattes/LinkedIn)</label>
                <input type="url" className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl px-5 py-4 text-sm font-black outline-none focus:border-blue-500" value={newRecordForm.linkCurriculo} onChange={e => setNewRecordForm({...newRecordForm, linkCurriculo: e.target.value})} />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsNewRecordModalOpen(false)} className="flex-1 px-4 py-4 text-slate-400 font-black text-[10px] uppercase">Cancelar</button>
                <button type="submit" className="flex-[2] bg-blue-600 text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase shadow-xl hover:bg-slate-900 transition-all">Salvar e Mascarar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADMIN: GESTÃO DE CONTRATO */}
      {contractModal && isAdmin && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 mb-6 flex items-center gap-2">
              <span className="text-blue-600">🛡️</span> Gestão Contratual
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-8 border-b pb-4">Servidor: {contractModal.nome}</p>
            
            <form onSubmit={handleContractSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Início de Contrato / Exercício</label>
                <input type="date" className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:border-blue-500" value={contractForm.dataInicioContrato} onChange={e => setContractForm({...contractForm, dataInicioContrato: e.target.value})} />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Número de Prorrogações</label>
                <div className="flex items-center gap-4">
                  <input type="number" min="0" className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:border-blue-500 text-center" value={contractForm.prorrogacoes} onChange={e => setContractForm({...contractForm, prorrogacoes: parseInt(e.target.value) || 0})} />
                  <div className="flex flex-col gap-1">
                    <button type="button" onClick={() => setContractForm({...contractForm, prorrogacoes: contractForm.prorrogacoes + 1})} className="bg-slate-100 p-2 rounded-lg hover:bg-slate-200">▲</button>
                    <button type="button" onClick={() => setContractForm({...contractForm, prorrogacoes: Math.max(0, contractForm.prorrogacoes - 1)})} className="bg-slate-100 p-2 rounded-lg hover:bg-slate-200">▼</button>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setContractModal(null)} className="flex-1 px-4 py-4 text-slate-400 font-black text-[10px] uppercase">Cancelar</button>
                <button type="submit" className="flex-[2] bg-slate-950 text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase shadow-xl hover:bg-blue-600 transition-all">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PADRÃO: DATAS LEGAIS */}
      {dateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black uppercase text-slate-900 mb-8 text-center">{dateModal.type === 'posse' ? 'Registrar Posse' : 'Registrar Exercício'}</h3>
            <div className="space-y-6">
              <input type="date" className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl px-6 py-4 text-sm font-black focus:border-blue-500 outline-none" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
              {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[10px] font-black uppercase border border-red-100">{error}</div>}
              <div className="flex gap-4">
                <button onClick={() => setDateModal(null)} className="flex-1 px-4 py-4 text-slate-400 font-black text-[10px] uppercase">Sair</button>
                <button onClick={handleDateConfirm} className="flex-[2] bg-slate-950 text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase shadow-xl hover:bg-blue-600">Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VÍNCULO */}
      {allocatingId && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-12 shadow-2xl animate-in slide-in-from-bottom-8">
            <h3 className="text-2xl font-black mb-8 uppercase text-slate-900 border-b pb-6 tracking-tighter italic">Pactuar Ingresso</h3>
            <form onSubmit={(e) => { e.preventDefault(); onUpdateCandidato(allocatingId, editForm); setAllocatingId(null); }} className="space-y-6">
              <select required className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold bg-slate-50 outline-none focus:border-blue-500" value={editForm.cargoId} onChange={e => setEditForm({...editForm, cargoId: e.target.value})}>
                <option value="">Selecione Cargo...</option>
                {cargos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              <select required className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold bg-slate-50 outline-none focus:border-blue-500" value={editForm.portariaId} onChange={e => setEditForm({...editForm, portariaId: e.target.value})}>
                <option value="">Selecione Portaria...</option>
                {portarias.map(p => <option key={p.id} value={p.id}>{p.numero}</option>)}
              </select>
              <select required className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold bg-slate-50 outline-none focus:border-blue-500" value={editForm.uorgId} onChange={e => setEditForm({...editForm, uorgId: e.target.value})}>
                <option value="">Selecione Unidade...</option>
                {unidades.map(u => <option key={u.uorg} value={u.uorg}>{u.sigla} - {u.nome}</option>)}
              </select>
              <div className="flex justify-end gap-4 pt-10">
                <button type="button" onClick={() => setAllocatingId(null)} className="px-6 py-4 text-slate-400 font-black uppercase text-[10px]">Voltar</button>
                <button type="submit" className="flex-1 bg-slate-950 text-white px-10 py-4 rounded-xl font-black text-[10px] uppercase hover:bg-blue-600 shadow-xl">Salvar Vínculo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NominatedCandidates;
